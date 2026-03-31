import { HttpClient } from "./HttpClient";
import { ChatRoom } from "../models/ChatRoom";
import { ChatMessage } from "../models/ChatMessage";

const safeText = (value) => `${value ?? ""}`.trim();

export class ChatService {
  static #instance = null;

  static instance() {
    if (!ChatService.#instance) ChatService.#instance = new ChatService();
    return ChatService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  async listMyChats() {
    const result = await this.http.get("/api/chats");
    const chats = Array.isArray(result?.chats)
      ? result.chats.map((item) => ChatRoom.fromJSON(item))
      : [];

    return { chats };
  }

  async listMessages(chatId) {
    const normalizedChatId = safeText(chatId);
    if (!normalizedChatId) return { messages: [] };

    const result = await this.http.get(`/api/chats/${encodeURIComponent(normalizedChatId)}/messages`);
    const messages = Array.isArray(result?.messages)
      ? result.messages.map((item) => ChatMessage.fromJSON(item))
      : [];

    return {
      chat: result?.chat ? ChatRoom.fromJSON(result.chat) : null,
      messages,
    };
  }

  async startChat({ productId, ownerId, message } = {}) {
    const result = await this.http.post("/api/chats", {
      productId,
      ownerId,
      message: safeText(message),
    });

    return {
      chatId: result?.chatId ?? result?.chat?.id ?? "",
      chat: result?.chat ? ChatRoom.fromJSON(result.chat) : null,
      message: result?.message ?? "สร้างห้องแชทแล้ว",
    };
  }

  async sendMessage({ chatId, text, imageFile, videoFile } = {}) {
    const normalizedChatId = safeText(chatId);
    const normalizedText = safeText(text);
    if (!normalizedChatId) throw new Error("ไม่พบ chatId");
    if (imageFile && videoFile) {
      throw new Error("กรุณาแนบได้ทีละ 1 ไฟล์");
    }
    if (!normalizedText && !imageFile && !videoFile) {
      throw new Error("กรุณากรอกข้อความหรือแนบรูปภาพ/วิดีโอ");
    }

    const endpoint = `/api/chats/${encodeURIComponent(normalizedChatId)}/messages`;
    const hasMedia = Boolean(imageFile || videoFile);
    const body = hasMedia ? new FormData() : { text: normalizedText };

    if (hasMedia) {
      body.append("text", normalizedText);
      if (imageFile) body.append("image", imageFile);
      if (videoFile) body.append("video", videoFile);
    }

    const result = await this.http.request(endpoint, {
      method: "POST",
      body,
    });

    return {
      chat: result?.chat ? ChatRoom.fromJSON(result.chat) : null,
      message: result?.message ? ChatMessage.fromJSON(result.message) : null,
    };
  }

  async respondMeetupProposal({ chatId, messageId, action, location } = {}) {
    const normalizedChatId = safeText(chatId);
    const normalizedMessageId = safeText(messageId);
    const normalizedAction = safeText(action);
    const normalizedLocation = safeText(location);

    if (!normalizedChatId) throw new Error("ไม่พบ chatId");
    if (!normalizedMessageId) throw new Error("ไม่พบ messageId");
    if (!normalizedAction) throw new Error("ไม่พบ action สำหรับข้อเสนอนัดรับ");
    if (normalizedAction === "counter" && !normalizedLocation) {
      throw new Error("กรุณาระบุสถานที่นัดรับใหม่");
    }

    const result = await this.http.post(
      `/api/chats/${encodeURIComponent(normalizedChatId)}/meetup-proposals/${encodeURIComponent(normalizedMessageId)}/respond`,
      {
        action: normalizedAction,
        location: normalizedLocation,
      },
    );

    return {
      chat: result?.chat ? ChatRoom.fromJSON(result.chat) : null,
      message: result?.message ? ChatMessage.fromJSON(result.message) : null,
    };
  }

  async confirmMeetupHandover({ chatId, messageId } = {}) {
    const normalizedChatId = safeText(chatId);
    const normalizedMessageId = safeText(messageId);

    if (!normalizedChatId) throw new Error("ไม่พบ chatId");
    if (!normalizedMessageId) throw new Error("ไม่พบ messageId");

    const result = await this.http.post(
      `/api/chats/${encodeURIComponent(normalizedChatId)}/meetup-proposals/${encodeURIComponent(normalizedMessageId)}/handover`,
      {},
    );

    return {
      chat: result?.chat ? ChatRoom.fromJSON(result.chat) : null,
      message: result?.message ? ChatMessage.fromJSON(result.message) : null,
    };
  }
}
