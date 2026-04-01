const chatService = require("../services/chatService");
const { saveUploadedFile } = require("../services/fileStorageService");

const handleChatError = (res, error, fallbackMessage) => {
  const statusCode = Number(error?.status) || 500;
  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? fallbackMessage : error.message,
    ...(statusCode >= 500 ? { error: error.message } : {}),
  });
};

const listMyChats = async (req, res) => {
  try {
    const chats = await chatService.listMyChats({
      req,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      chats,
    });
  } catch (error) {
    return handleChatError(res, error, "Server error while fetching chats");
  }
};

const listMessages = async (req, res) => {
  try {
    const result = await chatService.listMessages({
      req,
      userId: req.user.id,
      chatId: req.params.chatId,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleChatError(res, error, "Server error while fetching chat messages");
  }
};

const startChat = async (req, res) => {
  try {
    const result = await chatService.startChat({
      req,
      userId: req.user.id,
      productId: req.body?.productId,
      ownerId: req.body?.ownerId,
      message: req.body?.message,
    });

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleChatError(res, error, "Server error while creating chat");
  }
};

const sendMessage = async (req, res) => {
  try {
    const imageFile = req.files?.image?.[0] ?? null;
    const videoFile = req.files?.video?.[0] ?? null;
    const imageUrl = imageFile
      ? await saveUploadedFile(imageFile, {
          folder: "secondhand/chat/images",
          resourceType: "image",
        })
      : "";
    const videoUrl = videoFile
      ? await saveUploadedFile(videoFile, {
          folder: "secondhand/chat/videos",
          resourceType: "video",
        })
      : "";

    const result = await chatService.sendMessage({
      req,
      userId: req.user.id,
      chatId: req.params.chatId,
      text: req.body?.text ?? req.body?.message ?? "",
      imageUrl,
      videoUrl,
    });

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleChatError(res, error, "Server error while sending message");
  }
};

const respondMeetupProposal = async (req, res) => {
  try {
    const result = await chatService.respondMeetupProposal({
      req,
      userId: req.user.id,
      chatId: req.params.chatId,
      messageId: req.params.messageId,
      action: req.body?.action,
      location: req.body?.location,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleChatError(res, error, "Server error while responding to meetup proposal");
  }
};

const confirmMeetupHandover = async (req, res) => {
  try {
    const result = await chatService.confirmMeetupHandover({
      req,
      userId: req.user.id,
      chatId: req.params.chatId,
      messageId: req.params.messageId,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleChatError(res, error, "Server error while confirming meetup handover");
  }
};

module.exports = {
  listMyChats,
  listMessages,
  startChat,
  sendMessage,
  respondMeetupProposal,
  confirmMeetupHandover,
};
