import React from "react";
import { ChatService } from "../services/ChatService";

const safeText = (value) => `${value ?? ""}`.trim();

export class ChatPage extends React.Component {
  state = {
    loadingChats: true,
    chatsError: "",
    chats: [],
    selectedChatId: safeText(this.props.initialChatId),
    loadingMessages: false,
    messagesError: "",
    messages: [],
    draftText: "",
    draftImageFile: null,
    sending: false,
    sendingError: "",
  };

  chatService = ChatService.instance();

  async componentDidMount() {
    await this.loadChats({ preferredChatId: this.props.initialChatId });
  }

  async componentDidUpdate(prevProps) {
    const prevInitialChatId = safeText(prevProps.initialChatId);
    const nextInitialChatId = safeText(this.props.initialChatId);
    if (prevInitialChatId === nextInitialChatId || !nextInitialChatId) return;

    const hasPreferredChat = this.state.chats.some((chat) => chat.id === nextInitialChatId);
    if (hasPreferredChat) {
      await this.selectChat(nextInitialChatId);
      return;
    }

    await this.loadChats({ preferredChatId: nextInitialChatId });
  }

  loadChats = async ({ preferredChatId } = {}) => {
    this.setState({ loadingChats: true, chatsError: "" });

    try {
      const { chats } = await this.chatService.listMyChats();
      const preferred = safeText(preferredChatId) || safeText(this.state.selectedChatId);
      const hasPreferred = chats.some((chat) => chat.id === preferred);
      const nextSelectedChatId = hasPreferred ? preferred : chats[0]?.id ?? "";

      this.setState(
        {
          chats,
          selectedChatId: nextSelectedChatId,
          chatsError: "",
        },
        () => {
          if (nextSelectedChatId) {
            this.loadMessages(nextSelectedChatId);
          } else {
            this.setState({ messages: [], messagesError: "" });
          }
        },
      );
    } catch (e) {
      this.setState({
        chatsError: e?.message ?? "โหลดรายการแชทไม่สำเร็จ",
      });
    } finally {
      this.setState({ loadingChats: false });
    }
  };

  loadMessages = async (chatIdInput) => {
    const chatId = safeText(chatIdInput);
    if (!chatId) {
      this.setState({ messages: [], messagesError: "", loadingMessages: false });
      return;
    }

    this.setState({ loadingMessages: true, messagesError: "" });
    try {
      const { messages } = await this.chatService.listMessages(chatId);
      this.setState({
        messages: Array.isArray(messages) ? messages : [],
        messagesError: "",
      });
    } catch (e) {
      this.setState({
        messagesError: e?.message ?? "โหลดข้อความไม่สำเร็จ",
      });
    } finally {
      this.setState({ loadingMessages: false });
    }
  };

  selectChat = async (chatIdInput) => {
    const chatId = safeText(chatIdInput);
    if (!chatId) return;
    if (chatId === safeText(this.state.selectedChatId) && this.state.messages.length) return;

    this.setState({ selectedChatId: chatId, messages: [], messagesError: "" });
    await this.loadMessages(chatId);
  };

  setDraftText = (value) => {
    this.setState({ draftText: value ?? "", sendingError: "" });
  };

  setDraftImageFile = (file) => {
    this.setState({ draftImageFile: file ?? null, sendingError: "" });
  };

  clearDraftImageFile = () => {
    this.setState({ draftImageFile: null });
  };

  sendMessage = async (e) => {
    e.preventDefault();
    const { selectedChatId, draftText, draftImageFile } = this.state;
    if (!safeText(selectedChatId)) return;

    this.setState({ sending: true, sendingError: "" });
    try {
      const { message } = await this.chatService.sendMessage({
        chatId: selectedChatId,
        text: draftText,
        imageFile: draftImageFile,
      });

      this.setState((state) => ({
        draftText: "",
        draftImageFile: null,
        messages: message ? [...state.messages, message] : state.messages,
      }));

      if (!message) {
        await this.loadMessages(selectedChatId);
      }

      await this.loadChats({ preferredChatId: selectedChatId });
    } catch (e2) {
      this.setState({
        sendingError: e2?.message ?? "ส่งข้อความไม่สำเร็จ",
      });
    } finally {
      this.setState({ sending: false });
    }
  };

  openProductFromActiveChat = () => {
    const activeChat = this.getActiveChat();
    if (!activeChat?.productId) return;
    this.props.onOpenProduct?.({ id: activeChat.productId });
  };

  getActiveChat() {
    return this.state.chats.find((chat) => chat.id === this.state.selectedChatId) ?? null;
  }

  renderLeftPanel() {
    const { loadingChats, chatsError, chats, selectedChatId } = this.state;

    return (
      <section className="rounded-2xl bg-white shadow p-4 space-y-3">
        <div className="text-sm font-semibold text-zinc-800">แชทกับร้านค้า</div>

        {loadingChats ? <div className="text-sm text-zinc-500">กำลังโหลดรายการแชท...</div> : null}
        {chatsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {chatsError}
          </div>
        ) : null}
        {!loadingChats && !chatsError && !chats.length ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
            ยังไม่มีห้องแชทกับร้านค้า
          </div>
        ) : null}

        {!loadingChats && chats.length ? (
          <div className="max-h-[62dvh] overflow-y-auto space-y-2 pr-1 hide-scrollbar">
            {chats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                active={chat.id === selectedChatId}
                onClick={() => this.selectChat(chat.id)}
              />
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  renderRightPanel() {
    const {
      loadingMessages,
      messagesError,
      messages,
      draftText,
      draftImageFile,
      sending,
      sendingError,
    } = this.state;
    const userId = this.props.user?.id ?? "";
    const activeChat = this.getActiveChat();

    if (!activeChat) {
      return (
        <section className="rounded-2xl bg-white shadow p-6 text-sm text-zinc-500">
          เลือกห้องแชทจากรายการด้านซ้ายเพื่อเริ่มพูดคุยกับร้านค้า
        </section>
      );
    }

    return (
      <section className="rounded-2xl bg-white shadow p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-zinc-900 truncate">{activeChat.getDisplayName()}</div>
            <div className="text-xs text-zinc-500 truncate">สินค้า: {activeChat.getProductLabel()}</div>
          </div>
          <button
            type="button"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            onClick={this.openProductFromActiveChat}
            disabled={!activeChat?.productId}
          >
            ดูสินค้า
          </button>
        </div>

        {loadingMessages ? <div className="text-sm text-zinc-500">กำลังโหลดข้อความ...</div> : null}
        {messagesError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {messagesError}
          </div>
        ) : null}
        {!loadingMessages && !messagesError && !messages.length ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
            เริ่มส่งข้อความได้เลย
          </div>
        ) : null}

        {!loadingMessages && messages.length ? (
          <div className="max-h-[44dvh] overflow-y-auto space-y-2 pr-1 hide-scrollbar">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || `${message.chatId || activeChat.id}-${index}`}
                message={message}
                mine={message.isMine(userId)}
              />
            ))}
          </div>
        ) : null}

        <form className="space-y-2 border-t border-zinc-100 pt-3" onSubmit={this.sendMessage}>
          <textarea
            className="w-full min-h-24 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
            placeholder="พิมพ์ข้อความ..."
            value={draftText}
            onChange={(e) => this.setDraftText(e.target.value)}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                แนบรูป
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => this.setDraftImageFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {draftImageFile ? (
                <button
                  type="button"
                  className="rounded-xl border border-zinc-200 px-2.5 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
                  onClick={this.clearDraftImageFile}
                  title={draftImageFile.name}
                >
                  {draftImageFile.name}
                </button>
              ) : null}
            </div>

            <button
              type="submit"
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={sending}
            >
              {sending ? "กำลังส่ง..." : "ส่ง"}
            </button>
          </div>

          {sendingError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {sendingError}
            </div>
          ) : null}
        </form>
      </section>
    );
  }

  render() {
    return (
      <div className="min-h-dvh bg-zinc-50">
        <div className="sticky top-0 z-40 bg-[#A4E3D8] border-b border-zinc-200">
          <div className="mx-auto max-w-350 px-4 py-5 flex items-center gap-4">
            <button
              type="button"
              onClick={this.props.onGoHome}
              title="กลับหน้าแรก"
              className="shrink-0 rounded-xl border border-zinc-200 bg-white p-0"
            >
              <img
                src="/App logo.jpg"
                alt="App logo"
                className="h-20 w-20 rounded-xl object-cover"
              />
            </button>
            <div className="font-semibold">สินค้าที่ลงขาย</div>
          </div>
        </div>

        <div className="mx-auto max-w-375 px-4 py-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
            {this.renderLeftPanel()}
            {this.renderRightPanel()}
          </div>
        </div>
      </div>
    );
  }
}

class ChatListItem extends React.Component {
  render() {
    const { chat, active, onClick } = this.props;
    const avatarUrl = chat.getDisplayAvatarUrl();

    return (
      <button
        type="button"
        className={`w-full rounded-xl border p-3 text-left transition ${
          active ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white hover:bg-zinc-50"
        }`}
        onClick={onClick}
      >
        <div className="flex items-start gap-2">
          <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-200 overflow-hidden grid place-items-center text-xs">
            {avatarUrl ? (
              <img src={avatarUrl} alt={chat.getDisplayName()} className="h-full w-full object-cover" />
            ) : (
              <span>👤</span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="truncate text-sm font-semibold text-zinc-900">{chat.getDisplayName()}</div>
              <div className="text-[10px] text-zinc-500">{chat.getUpdatedAtLabel()}</div>
            </div>
            <div className="truncate text-xs text-zinc-500">สินค้า: {chat.getProductLabel()}</div>
            <div className="line-clamp-2 text-xs text-zinc-700 break-words">{chat.getLastMessagePreview()}</div>
          </div>
        </div>
      </button>
    );
  }
}

class MessageBubble extends React.Component {
  render() {
    const { message, mine } = this.props;
    const bubbleClass = mine
      ? "bg-zinc-900 text-white border-zinc-900"
      : "bg-zinc-100 text-zinc-800 border-zinc-200";

    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[75%] rounded-2xl border px-3 py-2 space-y-2 ${bubbleClass}`}>
          {!mine ? <div className="text-[11px] font-semibold">{message.senderName || "ผู้ใช้"}</div> : null}
          {message.hasImage() ? (
            <div className="rounded-xl overflow-hidden border border-black/10 bg-black/5">
              <img src={message.imageUrl} alt="chat-image" className="max-h-64 w-full object-cover" />
            </div>
          ) : null}
          {message.hasText() ? <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div> : null}
          <div className={`text-[10px] ${mine ? "text-zinc-300" : "text-zinc-500"}`}>{message.getTimeLabel()}</div>
        </div>
      </div>
    );
  }
}
