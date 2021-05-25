var express = require("express");
const router = express.Router();
const {
  listFiles,
  createItem,
  uploadFile,
  permission_swt,
  renameFile,
  get_url,
  downloadFile,
  del_filefolder,
  duplicateFile,
  searchfile,
  insert_file_into_folder,
  googleSignIn,
  googleCallback,
  listSheetCells,
} = require("../controllers/apiController");

router.route("/list").get(listFiles);
router.route("/create").post(createItem);
router.route("/upload").post(uploadFile);
router.route("/change_permission").post(permission_swt);
router.route("/rename").put(renameFile);
router.route("/get_url").get(get_url);
router.route("/download").get(downloadFile);
router.route("/delete").delete(del_filefolder);
router.route("/duplicate").put(duplicateFile);
router.route("/search").get(searchfile);
router.route("/move").put(insert_file_into_folder);
router.route("/").get(googleSignIn);
router.route("/listSheetCells").get(listSheetCells);
router.route("/google/callback").get(googleCallback);

module.exports = router;
