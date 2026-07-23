const express = require('express');
const resourceController = require('../controllers/resourceController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorizeAdmin);

router.get('/', resourceController.getResources);
router.post('/', resourceController.createResource);
router.get('/:id/files/:fileId/download', resourceController.downloadResourceFile);
router.post('/:id/comments', resourceController.addResourceComment);
router.get('/:id', resourceController.getResourceById);
router.put('/:id', resourceController.updateResource);
router.delete('/:id', resourceController.deleteResource);

module.exports = router;
