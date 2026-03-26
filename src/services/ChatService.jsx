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

  // โครง backend: GET /api/chats (ดึงรายการแชทของผู้ใช้จาก database)
  async listMyChats() {
    const result = await this.http.get("/api/chats");
    const chats = Array.isArray(result?.chats)
      ? result.chats.map((item) => ChatRoom.fromJSON(item))
      : [];

    return { chats };
  }

  // โครง backend: GET /api/chats/:chatId/messages (ดึงข้อความในห้องแชทจาก database)
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

  // โครง backend: POST /api/chats (เริ่มห้องแชทใหม่และเก็บลง database)
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

  // โครง backend: POST /api/chats/:chatId/messages (ส่งข้อความ/รูป และ persist ลง database)
  async sendMessage({ chatId, text, imageFile } = {}) {
    const normalizedChatId = safeText(chatId);
    const normalizedText = safeText(text);
    if (!normalizedChatId) throw new Error("ไม่พบ chatId");
    if (!normalizedText && !imageFile) {
      throw new Error("กรุณากรอกข้อความหรือแนบรูปภาพ");
    }

    const endpoint = `/api/chats/${encodeURIComponent(normalizedChatId)}/messages`;
    const hasImage = Boolean(imageFile);
    const body = hasImage ? new FormData() : { text: normalizedText };

    if (hasImage) {
      body.append("text", normalizedText);
      body.append("image", imageFile);
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
}
