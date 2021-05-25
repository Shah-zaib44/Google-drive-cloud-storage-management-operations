const fs = require("fs");
const { google } = require("googleapis");
const ErrorResponse = require("../middleware/erroResponse");
const multer = require("multer");

SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata",
  "https://www.googleapis.com/auth/drive.appdata",
];
SPREADSHEET_DRIVE_URL = "https://docs.google.com/spreadsheets/d/";
mimeType = {
  folder: "application/vnd.google-apps.folder",
  excel_gs: "application/vnd.google-apps.spreadsheet",
  excel_ms: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  text: "text/plain",
  doc: "application/vnd.google-apps.document",
};

const TOKEN_PATH = "token.json";

downloads_dir = "downloads_dir/";

let auth;

var Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./uploads");
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  },
});
var upload = multer({
  storage: Storage,
}).single("file");

fs.readFile("credentials.json", (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);

  const { client_secret, client_id, redirect_uris } = JSON.parse(content).web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  auth = oAuth2Client;
});
exports.googleSignIn = (req, res) => {
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      // Generate an OAuth URL and redirect there

      const authUrl = auth.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
      });
      res.redirect(authUrl);
    } else {
      auth.setCredentials(JSON.parse(token));

      res.redirect("/api/v1/list");
    }
  });
};
exports.googleCallback = (req, res) => {
  const code = req.query.code;
  if (code) {
    // Get an access token based on our OAuth code
    auth.getToken(code, function (err, tokens) {
      if (err) {
        console.log("Error authenticating");
      } else {
        console.log("Successfully authenticated");

        fs.writeFile(TOKEN_PATH, JSON.stringify(tokens), (err) => {
          if (err) return console.error(err);
          console.log("Token stored to", TOKEN_PATH);
        });
        auth.setCredentials(tokens);

        res.redirect("/api/v1/list");
      }
    });
  }
};
function searchFile(pageSize, q) {
  const drive = google.drive({ version: "v3", auth });
  // # Call the google drive api files().list() method with query parameter to specify
  // 	# the exact file property to look for
  return drive.files.list({
    q: `name='${q}'`,
    fields: "nextPageToken, files(id, name,kind,mimeType)",
    pageSize: pageSize,
  });
}
exports.listSheetCells = (req, res, next) => {
  let file_name = JSON.parse(JSON.stringify(req.query)).file_name;
  let sheet_name = JSON.parse(JSON.stringify(req.query)).sheet_name;
  let start_cell = JSON.parse(JSON.stringify(req.query)).start_cell;
  let end_cell = JSON.parse(JSON.stringify(req.query)).end_cell;
  // # Use search to get file id
  searchFile(10, file_name)
    .then((result) => {
      if (result.data.files.length == 0) {
        next(new ErrorResponse("File not found", 404));
      } else if (result.data.files.length > 1) {
        next(
          new ErrorResponse(
            `More than one item with the name: ${file_name} was found`,
            400
          )
        );
      } else {
        const sheets = google.sheets({ version: "v4", auth });
        sheets.spreadsheets.values.get(
          {
            spreadsheetId: result.data.files[0].id,
            range: `${sheet_name}!${start_cell}:${end_cell}`,
          },
          (err, resp) => {
            if (err) return console.log("The API returned an error: " + err);
            const rows = resp.data.values;
            if (rows.length) {
              //Print columns
              res.status(200).json({
                success: true,
                data: rows,
              });
            } else {
              next(new ErrorResponse("No data found", 404));
            }
          }
        );
      }
    })
    .catch((err) => next(new ErrorResponse(err, 400)));
};

exports.listFiles = (req, res, next) => {
  console.log("hi:", auth);

  const drive = google.drive({ version: "v3", auth });
  // # Call the google drive api files().list() method to list all the files and folder
  // # within google drive
  drive.files
    .list({
      pageSize: 10,
      fields: "nextPageToken, files(id, name)",
    })
    .then((file) => {
      if (file.data.files.length > 0) {
        // # Print the results
        // # Print the file name and id for each file found
        res.status(200).json({
          success: true,
          data: file.data.files,
        });
      } else {
        next(new ErrorResponse("File not found", 404));
      }
    })
    .catch((err) => {
      next(new ErrorResponse(err, 400));
    });
};

exports.createItem = (req, res, next) => {
  let name = JSON.parse(JSON.stringify(req.query)).name;

  const drive = google.drive({ version: "v3", auth });
  // # Define the folder metadata: name and folder mimeType
  var fileMetadata = {
    name: name,
    mimeType: mimeType.folder,
  };
  // # Call the google drive api files().create() method to create the folder
  drive.files.create(
    {
      resource: fileMetadata,
      fields: "id,name",
    },
    function (err, file) {
      if (err) {
        next(new ErrorResponse(err, 400));
      } else {
        res.status(200).json({
          success: true,
          data: {
            FolderId: file.data.id,
            FolderName: file.data.name,
          },
        });
      }
    }
  );
};

exports.uploadFile = (req, res, next) => {
  const drive = google.drive({ version: "v3", auth });
  upload(req, res, function (err) {
    if (err) {
      next(new ErrorResponse(err, 404));
    } else {
      const fileMetadata = {
        name: req.file.filename,
        mimeType: mimeType.excel_gs,
      };
      const media = {
        mimeType: mimeType.excel_ms,
        body: fs.createReadStream(req.file.path),
      };
      //# Call the google drive api files().create() method to upload file,
      drive.files.create(
        {
          resource: fileMetadata,
          media: media,
          fields: "id,name",
        },
        (err, file) => {
          if (err) {
            next(new ErrorResponse(err, 400));
          } else {
            res.status(200).json({
              success: true,
              data: {
                Filename: file.data.name,
                id: file.data.id,
              },
            });
          }
        }
      );
    }
  });
};

exports.permission_swt = (req, res, next) => {
  let file_name = JSON.parse(JSON.stringify(req.query)).file_name;

  const drive = google.drive({ version: "v3", auth });
  // # Use search to get file id
  searchFile(10, file_name)
    .then((result) => {
      if (result.data.files.length == 0) {
        next(new ErrorResponse("File not found", 404));
      } else if (result.data.files.length > 1) {
        next(
          new ErrorResponse(
            `More than one item with the name: ${file_name} was found`,
            400
          )
        );
      } else {
        permission = {
          type: "anyone",
          role: "writer",
        };
        //# Call the google drive api files().create() method to change permission of the file
        drive.permissions.create(
          {
            resource: permission,
            fileId: result.data.files[0].id,
            fields: "id",
          },
          function (err, re) {
            if (err) {
              next(new ErrorResponse(err, 400));
            } else {
              res.status(200).json({
                success: true,
                data: {
                  filename: file_name,
                },
              });
            }
          }
        );
      }
    })
    .catch((err) => next(new ErrorResponse(err, 400)));
};

exports.renameFile = (req, res, next) => {
  let file_name = JSON.parse(JSON.stringify(req.query)).file_name;
  let newFile_name = JSON.parse(JSON.stringify(req.query)).newFile_name;

  const drive = google.drive({ version: "v3", auth });
  // # Use search to get file id
  searchFile(10, file_name)
    .then((result) => {
      if (result.data.files.length == 0) {
        next(new ErrorResponse("File not found", 404));
      } else if (result.data.files.length > 1) {
        next(
          new ErrorResponse(
            `More than one item with the name: ${file_name} was found`,
            400
          )
        );
      } else {
        var fileId = result.data.files[0].id;
        // # define new newFile_name
        var body = {
          name: newFile_name,
        };
        // # Call the google drive api files().update() method to rename the duplicated file,
        drive.files.update(
          {
            fileId: fileId,
            resource: body,
          },
          (err, response) => {
            if (err) next(new ErrorResponse(err, 400));
            else {
              res.status(200).json({
                success: true,
                data: {
                  filename: file_name,

                  newFile_name: newFile_name,
                },
              });
            }
          }
        );
      }
    })
    .catch((err) => next(new ErrorResponse(err, 400)));
};

exports.get_url = (req, res, next) => {
  let file_name = JSON.parse(JSON.stringify(req.query)).file_name;

  // # Use search to get file id
  searchFile(10, file_name)
    .then((result) => {
      if (result.data.files.length == 0) {
        next(new ErrorResponse("File not found", 404));
      } else if (result.data.files.length > 1) {
        next(
          new ErrorResponse(
            `More than one item with the name: ${file_name} was found`,
            400
          )
        );
      } else {
        res.status(200).json({
          success: true,
          data: { url: SPREADSHEET_DRIVE_URL + result.data.files[0].id },
        });
      }
    })
    .catch((err) => next(new ErrorResponse(err, 400)));
};

exports.downloadFile = (req, res, next) => {
  let file_name = JSON.parse(JSON.stringify(req.query)).file_name;

  const drive = google.drive({ version: "v3", auth });
  // # Use search to get file id
  searchFile(10, file_name)
    .then((result) => {
      if (result.data.files.length == 0) {
        next(new ErrorResponse("File not found", 404));
      } else if (result.data.files.length > 1) {
        next(
          new ErrorResponse(
            `More than one item with the name: ${file_name} was found`,
            404
          )
        );
      } else {
        // # save the file into the specified file path
        if (file_name.includes(".xlsx")) {
          file_name = file_name;
        } else {
          file_name = file_name + ".xlsx";
        }
        var fileId = result.data.files[0].id;
        var dest = fs.createWriteStream(`${downloads_dir}${file_name}`);
        let progress = 0,
          p;
        // # Call the google drive api files().get() to retrieve a file specified by its
        // # file id and mimeType
        drive.files
          .get(
            { fileId, alt: "media" },
            { responseType: "stream", mimeType: mimeType.excel_ms }
          )
          .then((response) => {
            response.data
              .on("end", () => {
                res.status(200).json({
                  success: true,
                  data: `Done downloading file ${file_name} Downloaded ${progress} bytes`,
                });
              })
              .on("error", (err) => {
                next(new ErrorResponse(err, 400));
              })
              .on("data", (d) => {
                progress += d.length;
                p = progress;
              })
              .pipe(dest);
          })
          .catch((err) =>
            next(new ErrorResponse("Only excel files are allowed", 400))
          );
      }
    })
    .catch((err) => next(new ErrorResponse(err, 400)));
};

exports.del_filefolder = (req, res, next) => {
  let file_name = JSON.parse(JSON.stringify(req.query)).file_name;

  const drive = google.drive({ version: "v3", auth });
  // # Use search to get file id
  searchFile(10, file_name)
    .then((result) => {
      if (result.data.files.length == 0) {
        next(new ErrorResponse("File not found", 404));
      } else if (result.data.files.length > 1) {
        next(
          new ErrorResponse(
            `More than one item with the name: ${file_name} was found`,
            400
          )
        );
      } else {
        var fileId = result.data.files[0].id;
        // # Call the google drive api files().delete() to retrieve a file specified by its
        // # file id
        drive.files
          .delete({
            fileId: fileId,
          })
          .then((re) => {
            res.status(200).json({
              success: true,
              data: {
                filename: file_name,
                fileId: fileId,
              },
            });
          })
          .catch((err) => {
            next(new ErrorResponse(err, 400));
          });
      }
    })
    .catch((err) => next(new ErrorResponse(err, 400)));
};
exports.duplicateFile = (req, res, next) => {
  let file_name = JSON.parse(JSON.stringify(req.query)).file_name;
  let newFile_name = JSON.parse(JSON.stringify(req.query)).newFile_name;

  const drive = google.drive({ version: "v3", auth });
  // # Use search to get file id
  searchFile(10, file_name)
    .then((result) => {
      if (result.data.files.length == 0) {
        next(new ErrorResponse("File not found", 404));
      } else if (result.data.files.length > 1) {
        next(
          new ErrorResponse(
            `More than one item with the name: ${file_name} was found`,
            400
          )
        );
      } else {
        var fileId = result.data.files[0].id;
        var body = { title: "copiedFile" };
        // # Define the file metadata: name
        metadata = {
          name: newFile_name,
        };
        //       # Call the google drive api files().copy() method to duplicate the file specified
        // # by the unique file id
        drive.files
          .copy({
            fileId: fileId,
            resource: body,
          })
          .then((response) => {
            //           # Call the google drive api files().update() method to rename the duplicated file,
            // # new name defined in the metadata
            drive.files.update(
              {
                fileId: response.data.id,
                resource: metadata,
              },
              (err, resp) => {
                if (err) next(new ErrorResponse(err, 400));
                else {
                  res.status(200).json({
                    success: true,
                    data: {
                      filename: file_name,

                      newFile_name: newFile_name,
                      newFile_Id: response.data.id,
                    },
                  });
                }
              }
            );
          });
      }
    })
    .catch((err) => next(new ErrorResponse(err, 400)));
};

exports.searchfile = (req, res, next) => {
  let file_name = JSON.parse(JSON.stringify(req.query)).file_name;

  // # Use search to get file id
  searchFile(10, file_name)
    .then((result) => {
      if (result.data.files.length == 0) {
        next(new ErrorResponse("File not found", 404));
      } else {
        // # print(result)
        res.status(200).json({
          success: true,
          data: result.data.files,
        });
      }
    })
    .catch((err) => next(new ErrorResponse(err, 400)));
};

exports.insert_file_into_folder = (req, res, next) => {
  let file_name = JSON.parse(JSON.stringify(req.query)).file_name;
  let folder_name = JSON.parse(JSON.stringify(req.query)).folder_name;
  let search_names = [file_name, folder_name];

  let rest;
  let reste;
  // # Use search to get file id
  rest = searchFile(10, search_names[0])
    .then((result) => {
      if (result.data.files.length == 0) {
        next(new ErrorResponse("File not found", 404));
      } else if (result.data.files.length > 1) {
        next(
          new ErrorResponse(
            `More than one file with the name: ${result.data.files[0].name} was found`,
            400
          )
        );
      } else {
        return result.data.files[0].id;
      }
    })
    .catch((err) => next(new ErrorResponse(err, 400)));
  // # Use search to get folder id
  reste = searchFile(10, search_names[1])
    .then((result) => {
      if (result.data.files.length == 0) {
        next(new ErrorResponse("File not found", 404));
      } else if (result.data.files.length > 1) {
        next(
          new ErrorResponse(
            `More than one folder with the name: ${result.data.files[0].name} was found`,
            400
          )
        );
      } else {
        return result.data.files[0].id;
      }
    })
    .catch((err) => next(new ErrorResponse(err, 400)));

  const result = () => {
    rest.then((a) => {
      reste.then((b) => {
        fileId = a;
        folderId = b;

        const drive = google.drive({ version: "v3", auth });
        // Retrieve the existing parents to remove
        drive.files.get(
          {
            fileId: fileId,
            fields: "parents",
          },
          function (err, file) {
            if (err) {
              // Handle error
              next(new ErrorResponse(err, 400));
            } else {
              // Move the file to the new folder
              var previousParents = file.data.parents.join(",");
              drive.files.update(
                {
                  fileId: fileId,
                  addParents: folderId,
                  removeParents: previousParents,
                  fields: "id, parents",
                },
                function (err, file) {
                  if (err) {
                    next(new ErrorResponse(err, 400));
                  } else {
                    res.status(200).json({
                      success: true,
                      data: {
                        filename: search_names[0],

                        foldername: search_names[1],
                      },
                    });
                  }
                }
              );
            }
          }
        );
      });
    });
  };

  result();
};
