const express = require('express');
const boardController = require('../controllers/boardController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuthenticate, boardController.getPosts);
router.get('/:id', optionalAuthenticate, boardController.getPostById);
router.post('/:id/unlock', optionalAuthenticate, boardController.unlockPost);
router.post('/:id/view', optionalAuthenticate, boardController.incrementViewCount);
router.post('/', optionalAuthenticate, boardController.createPost);
router.put('/:id', authenticate, boardController.updatePost);
router.delete('/:id', optionalAuthenticate, boardController.deletePost);

module.exports = router;
