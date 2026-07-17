const mongoose = require('mongoose');

const boardPostViewSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BoardPost',
      required: true,
      index: true,
    },
    viewerKey: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

boardPostViewSchema.index({ post: 1, viewerKey: 1 }, { unique: true });

const BoardPostView = mongoose.model('BoardPostView', boardPostViewSchema);

module.exports = BoardPostView;
