// UNCOMMENT EACH MODEL HERE AS NEEDED

const Replies = require("../models/replies");
const Comments = require("../models/comments");
const { ObjectId } = require("mongoose").Types;

const CustomError = require("../utils/customError");
const responseHandler = require("../utils/responseHandler");

const getCommentReplies = async (req, res, next) => {
  const { commentId } = req.params;

  if (!ObjectId.isValid(commentId)) {
    return next(new CustomError(400, " Invalid comment Id "));
  }
  try {
    //check if such comment exists
    const comment = await Comments.findById(commentId);
    // If the comment does not exist,send an error msg
    if (!comment) {
      return next(new CustomError(404, " Comment not found "));
    }

    const replies = await Replies.find({ commentId: commentId }).populate(
      "replyOwner"
    );
    let message = " Replies found. ";
    if (!replies.length) {
      message = " No replies found. ";
    }
    return responseHandler(res, 200, replies, message);
  } catch (err) {
    next(err);
  }
};

const createReply = async (req, res, next) => {
  try {
    //validation should be done via middleware
    //ownerId in body also needs to be validated

    const { ownerId, content } = req.body;
    const { commentId } = req.params;

    if (!ObjectId.isValid(commentId)) {
      next(new CustomError(404, "invalid ID"));
      return;
    }

    if (!ownerId || !content) {
      next(new CustomError(422, `Enter the required fields`));
      return;
    }
    const reply = new Replies({
      content,
      ownerId,
      commentId,
    });

    const savedReply = await reply.save();
    const parentComment = await Comments.findByIdAndUpdate(
      commentId,
      {
        $push: {
          replies: savedReply._id,
        },
      },
      {
        new: true,
      }
    );
    if (!parentComment) {
      next(
        new CustomError(
          404,
          `Comment with the ID ${commentId} does not exist or has been deleted`
        )
      );
      return;
    }
    const data = {
      replyId: savedReply._id,
      commentId: savedReply.commentId,
      content: savedReply.content,
      ownerId: savedReply.ownerId,
      upVotes: savedReply.upVotes,
      downVotes: savedReply.downVotes,
      flags: savedReply.flags,
    };

    responseHandler(res, 201, data, "Reply added successfully");
    return;
  } catch (error) {
    next(
      new CustomError(
        500,
        "Something went wrong, please try again later",
        error
      )
    );
    return;
  }
};

const flagCommentReplies = async (req, res, next) => {
  try {
    //validation should be done via middleware
    //ownerId in body also needs to be validated

    const { commentId, replyId } = req.params;
    const { ownerId } = req.body;

    if (!ObjectId.isValid(commentId)) {
      return next(new CustomError(422, " Invalid comment Id "));
    }

    if (!ObjectId.isValid(replyId)) {
      return next(new CustomError(422, " Invalid reply Id "));
    }
    const reply = await Replies.findOne({
      _id: replyId,
      commentId: commentId,
    });

    if (!reply) {
      next(
        new CustomError(
          404,
          `Reply with the ID ${replyId} doesn't exist or has been deleted`
        )
      );
      return;
    }

    //flag comment reply by pushing ownerId into flags array
    if (!reply.flags.includes(ownerId)) {
      reply.flags.push(ownerId);
    } else {
      const index = reply.flags.indexOf(ownerId);
      reply.flags.splice(index, 1);
    }

    const data = {
      replyId: reply._id,
      commentId: reply.commentId,
      numOfFlags: reply.flags.length,
    };

    return responseHandler(
      res,
      200,
      data,
      "Reply has been flagged successfully"
    );
  } catch (error) {
    next(
      new CustomError(
        500,
        "Something went wrong, please try again later",
        error
      )
    );
    return;
  }
};

module.exports = {
  getCommentReplies,
  createReply,
  flagCommentReplies,
};
