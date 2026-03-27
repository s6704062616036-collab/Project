import React from "react";
import { ChatService } from "../services/ChatService";
import { RealtimeSyncManager } from "../utils/RealtimeSyncManager";

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
    proposalActionLoadingId: "",
    proposalActionError: "",
    proposalActionErrorMessageId: "",
  };

  chatService = ChatService.instance();
  realtimeSync = new RealtimeSyncManager({
    onRefresh: () => this.refreshChatsAndMessages(),
    databasePollIntervalMs: 4000,
  });
  realtimeRefreshInFlight = false;
  pendingRealtimeRefresh = false;

  async componentDidMount() {
    await this.loadChats({ preferredChatId: this.props.initialChatId });
    this.realtimeSync.start();
  }

  componentWillUnmount() {
    this.realtimeSync.stop();
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

  refreshChatsAndMessages = async () => {
    if (this.realtimeRefreshInFlight) {
      this.pendingRealtimeRefresh = true;
      return;
    }

    this.realtimeRefreshInFlight = true;
    try {
      await this.loadChats({ preferredChatId: this.state.selectedChatId });
    } finally {
      this.realtimeRefreshInFlight = false;
    }

    if (this.pendingRealtimeRefresh) {
      this.pendingRealtimeRefresh = false;
      this.refreshChatsAndMessages();
    }
  };

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

  respondMeetupProposal = async ({ messageId, action, location } = {}) => {
    const chatId = safeText(this.state.selectedChatId);
    const normalizedMessageId = safeText(messageId);
    if (!chatId || !normalizedMessageId) return;

    this.setState({
      proposalActionLoadingId: normalizedMessageId,
      proposalActionError: "",
      proposalActionErrorMessageId: "",
    });

    try {
      await this.chatService.respondMeetupProposal({
        chatId,
        messageId: normalizedMessageId,
        action,
        location,
      });

      await this.loadMessages(chatId);
      await this.loadChats({ preferredChatId: chatId });
    } catch (e) {
      this.setState({
        proposalActionError: e?.message ?? "ตอบกลับข้อเสนอนัดรับไม่สำเร็จ",
        proposalActionErrorMessageId: normalizedMessageId,
      });
    } finally {
      this.setState({ proposalActionLoadingId: "" });
    }
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
      proposalActionLoadingId,
      proposalActionError,
      proposalActionErrorMessageId,
    } = this.state;
    const userId = this.props.user?.id ?? "";
    const activeChat = this.getActiveChat();
    const canSellerRespondMeetupProposal = safeText(activeChat?.ownerId) === safeText(userId);

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
                canSellerRespondMeetupProposal={canSellerRespondMeetupProposal}
                onRespondMeetupProposal={this.respondMeetupProposal}
                responding={proposalActionLoadingId === message.id}
                actionError={
                  proposalActionErrorMessageId === message.id ? proposalActionError : ""
                }
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
    const {
      message,
      mine,
      canSellerRespondMeetupProposal,
      onRespondMeetupProposal,
      responding,
      actionError,
    } = this.props;

    if (message?.isMeetupProposal?.()) {
      return (
        <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
          <MeetupProposalCard
            message={message}
            mine={mine}
            canSellerRespond={canSellerRespondMeetupProposal}
            onRespond={onRespondMeetupProposal}
            responding={responding}
            error={actionError}
          />
        </div>
      );
    }

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

class MeetupProposalCard extends React.Component {
  state = {
    editingCounterLocation: false,
    counterLocation: this.getDefaultCounterLocation(this.props),
  };

  componentDidUpdate(prevProps) {
    const prevLocation =
      prevProps.message?.meetupProposal?.responseLocation ||
      prevProps.message?.meetupProposal?.location ||
      "";
    const nextLocation =
      this.props.message?.meetupProposal?.responseLocation ||
      this.props.message?.meetupProposal?.location ||
      "";

    if (prevProps.message?.id !== this.props.message?.id || prevLocation !== nextLocation) {
      this.setState({
        editingCounterLocation: false,
        counterLocation: this.getDefaultCounterLocation(this.props),
      });
    }
  }

  getDefaultCounterLocation(props = this.props) {
    return (
      props?.message?.meetupProposal?.responseLocation ||
      props?.message?.meetupProposal?.location ||
      ""
    );
  }

  openCounterEditor = () => {
    this.setState({
      editingCounterLocation: true,
      counterLocation: this.getDefaultCounterLocation(),
    });
  };

  closeCounterEditor = () => {
    this.setState({
      editingCounterLocation: false,
      counterLocation: this.getDefaultCounterLocation(),
    });
  };

  setCounterLocation = (value) => {
    this.setState({ counterLocation: value ?? "" });
  };

  submitAction = (action) => {
    this.props.onRespond?.({
      messageId: this.props.message?.id,
      action,
      location: this.state.counterLocation,
    });
  };

  renderStatusBadge(message) {
    const status = message?.getMeetupProposalStatus?.() ?? "";
    const label = message?.getMeetupProposalStatusLabel?.() ?? "ข้อเสนอนัดรับ";
    const className =
      status === "awaiting_meetup"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : status === "countered_by_seller"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : status === "cancelled_by_seller"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-amber-200 bg-amber-50 text-amber-700";

    return <div className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>{label}</div>;
  }

  render() {
    const { message, mine, canSellerRespond, responding, error } = this.props;
    const { editingCounterLocation, counterLocation } = this.state;
    const proposalStatus = message?.getMeetupProposalStatus?.() ?? "";
    const proposalLocation = message?.meetupProposal?.location ?? "";
    const responseLocation = message?.meetupProposal?.responseLocation ?? "";
    const canAct = canSellerRespond && proposalStatus === "pending_seller_response";

    return (
      <div
        className={`max-w-[85%] rounded-2xl border p-3 space-y-3 ${
          mine ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-800"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">ข้อเสนอสถานที่นัดรับ</div>
            <div className={`text-[11px] ${mine ? "text-zinc-300" : "text-zinc-500"}`}>
              คำสั่งซื้อ #{message?.orderId || "-"}
            </div>
          </div>
          {this.renderStatusBadge(message)}
        </div>

        <div className={`rounded-xl border p-3 ${mine ? "border-white/15 bg-white/10" : "border-zinc-200 bg-zinc-50"}`}>
          <div className={`text-xs ${mine ? "text-zinc-300" : "text-zinc-500"}`}>สถานที่ที่ผู้ซื้อเสนอ</div>
          <div className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">
            {proposalLocation || "ยังไม่ได้ระบุสถานที่นัดรับ"}
          </div>
          {responseLocation ? (
            <>
              <div className={`mt-3 text-xs ${mine ? "text-zinc-300" : "text-zinc-500"}`}>สถานที่ที่คนขายเสนอใหม่</div>
              <div className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{responseLocation}</div>
            </>
          ) : null}
        </div>

        {proposalStatus === "awaiting_meetup" ? (
          <div className={`text-xs ${mine ? "text-zinc-300" : "text-zinc-500"}`}>
            คนขายยอมรับข้อเสนอแล้ว สถานะตอนนี้คือรอนัดพบ
          </div>
        ) : null}

        {proposalStatus === "countered_by_seller" ? (
          <div className={`text-xs ${mine ? "text-zinc-300" : "text-zinc-500"}`}>
            คนขายได้เสนอเปลี่ยนสถานที่นัดรับแล้ว สามารถคุยรายละเอียดต่อในแชทนี้ได้
          </div>
        ) : null}

        {proposalStatus === "cancelled_by_seller" ? (
          <div className={`text-xs ${mine ? "text-zinc-300" : "text-zinc-500"}`}>
            คนขายยกเลิกการนัดรับแล้ว หากต้องการดำเนินการต่อให้คุยรายละเอียดใหม่ในแชท
          </div>
        ) : null}

        {canAct ? (
          <div className="space-y-2">
            {!editingCounterLocation ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  onClick={() => this.submitAction("accept")}
                  disabled={responding}
                >
                  ยอมรับข้อเสนอ
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                    mine ? "border border-white/20 text-white" : "border border-zinc-200 text-zinc-700"
                  }`}
                  onClick={this.openCounterEditor}
                  disabled={responding}
                >
                  เปลี่ยนสถานที่รับและส่ง
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  onClick={() => this.submitAction("cancel")}
                  disabled={responding}
                >
                  ยกเลิกการนัดรับ
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  className="min-h-24 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none"
                  placeholder="ระบุสถานที่นัดรับใหม่ที่ต้องการเสนอ"
                  value={counterLocation}
                  onChange={(e) => this.setCounterLocation(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    onClick={() => this.submitAction("counter")}
                    disabled={responding}
                  >
                    ส่งสถานที่ใหม่
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-60"
                    onClick={this.closeCounterEditor}
                    disabled={responding}
                  >
                    ปิด
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <div className={`text-[10px] ${mine ? "text-zinc-300" : "text-zinc-500"}`}>{message?.getTimeLabel?.()}</div>
      </div>
    );
  }
}
