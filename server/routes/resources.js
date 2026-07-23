const express = require('express');
const resourceController = require('../controllers/resourceController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', resourceController.getResources);
router.get('/:id/files/:fileId/download', resourceController.downloadResourceFile);
router.patch('/:id/status', resourceController.updateResourceStatus);
router.post('/:id/comments', resourceController.addResourceComment);
router.get('/:id', resourceController.getResourceById);

router.post('/', resourceController.createResource);
router.put('/:id', authorizeAdmin, resourceController.updateResource);
router.delete('/:id', authorizeAdmin, resourceController.deleteResource);

module.exports = router;
