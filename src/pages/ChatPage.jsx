import React from "react";
import { ChatService } from "../services/ChatService";
import { RealtimeSyncManager } from "../utils/RealtimeSyncManager";

const safeText = (value) => `${value ?? ""}`.trim();

const getAvatarFallback = (name) => {
  const normalized = safeText(name);
  if (!normalized) return "👤";
  return normalized.charAt(0).toUpperCase();
};

const ChatAvatar = ({ src, name, sizeClass = "h-10 w-10", textClass = "text-sm" }) => {
  const normalizedSrc = safeText(src);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [normalizedSrc]);

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-1 ring-zinc-200 grid place-items-center font-semibold text-zinc-600 ${textClass}`}
    >
      {normalizedSrc && !imageFailed ? (
        <img
          src={normalizedSrc}
          alt={safeText(name) || "avatar"}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{getAvatarFallback(name)}</span>
      )}
    </div>
  );
};

const ChatMediaImage = ({ src, alt, onOpenImage }) => {
  const normalizedSrc = safeText(src);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [normalizedSrc]);

  if (!normalizedSrc || imageFailed) {
    return (
      <div className="grid min-h-40 place-items-center rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-6 text-center text-xs text-zinc-500">
        ไม่สามารถแสดงรูปภาพนี้ได้
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-black/10 bg-black/5">
      <button
        type="button"
        className="block w-full cursor-zoom-in"
        onClick={() =>
          onOpenImage?.({
            imageUrl: normalizedSrc,
            alt,
          })
        }
      >
        <img
          src={normalizedSrc}
          alt={alt || "chat-image"}
          className="max-h-72 w-full object-contain bg-white"
          onError={() => setImageFailed(true)}
        />
      </button>
    </div>
  );
};

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
    draftVideoFile: null,
    sending: false,
    sendingError: "",
    proposalActionLoadingId: "",
    proposalActionError: "",
    proposalActionErrorMessageId: "",
    lightboxImageUrl: "",
    lightboxImageAlt: "",
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
      await this.loadChats({
        preferredChatId: this.state.selectedChatId,
        silent: true,
      });
    } finally {
      this.realtimeRefreshInFlight = false;
    }

    if (this.pendingRealtimeRefresh) {
      this.pendingRealtimeRefresh = false;
      this.refreshChatsAndMessages();
    }
  };

  loadChats = async ({ preferredChatId, silent = false } = {}) => {
    if (!silent) {
      this.setState({ loadingChats: true, chatsError: "" });
    }

    try {
      const { chats } = await this.chatService.listMyChats();
      const preferred = safeText(preferredChatId) || safeText(this.state.selectedChatId);
      const hasPreferred = chats.some((chat) => chat.id === preferred);
      const nextSelectedChatId = hasPreferred ? preferred : chats[0]?.id ?? "";
      const previousSelectedChatId = safeText(this.state.selectedChatId);
      const shouldPreserveMessages = silent && nextSelectedChatId === previousSelectedChatId;

      this.setState(
        {
          chats,
          selectedChatId: nextSelectedChatId,
          chatsError: "",
        },
        () => {
          if (nextSelectedChatId) {
            this.loadMessages(nextSelectedChatId, {
              silent,
              preserveMessages: shouldPreserveMessages,
            });
          } else {
            this.setState({ messages: [], messagesError: "" });
          }
        },
      );
    } catch (e) {
      if (!silent) {
        this.setState({
        chatsError: e?.message ?? "โหลดรายการแชทไม่สำเร็จ",
        });
      }
    } finally {
      if (!silent) {
        this.setState({ loadingChats: false });
      }
    }
  };

  loadMessages = async (chatIdInput, { silent = false, preserveMessages = false } = {}) => {
    const chatId = safeText(chatIdInput);
    if (!chatId) {
      this.setState({ messages: [], messagesError: "", loadingMessages: false });
      return;
    }

    if (!silent) {
      this.setState({
        loadingMessages: true,
        messagesError: "",
        ...(preserveMessages ? {} : { messages: [] }),
      });
    }
    try {
      const { messages } = await this.chatService.listMessages(chatId);
      this.setState({
        messages: Array.isArray(messages) ? messages : [],
        messagesError: "",
      });
      this.props.onChatReadStateChanged?.();
    } catch (e) {
      if (!silent) {
        this.setState({
        messagesError: e?.message ?? "โหลดข้อความไม่สำเร็จ",
        });
      }
    } finally {
      if (!silent) {
        this.setState({ loadingMessages: false });
      }
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
    this.setState({
      draftImageFile: file ?? null,
      draftVideoFile: file ? null : this.state.draftVideoFile,
      sendingError: "",
    });
  };

  clearDraftImageFile = () => {
    this.setState({ draftImageFile: null });
  };

  setDraftVideoFile = (file) => {
    this.setState({
      draftVideoFile: file ?? null,
      draftImageFile: file ? null : this.state.draftImageFile,
      sendingError: "",
    });
  };

  clearDraftVideoFile = () => {
    this.setState({ draftVideoFile: null });
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

      await this.loadMessages(chatId, { silent: true, preserveMessages: true });
      await this.loadChats({ preferredChatId: chatId, silent: true });
    } catch (e) {
      this.setState({
        proposalActionError: e?.message ?? "ตอบกลับข้อเสนอนัดรับไม่สำเร็จ",
        proposalActionErrorMessageId: normalizedMessageId,
      });
    } finally {
      this.setState({ proposalActionLoadingId: "" });
    }
  };

  confirmMeetupHandover = async ({ messageId } = {}) => {
    const chatId = safeText(this.state.selectedChatId);
    const normalizedMessageId = safeText(messageId);
    if (!chatId || !normalizedMessageId) return;

    if (typeof window !== "undefined") {
      const confirmed = window.confirm("ยืนยันหรือไม่ว่าคุณส่งมอบสินค้ากับผู้ซื้อเรียบร้อยแล้ว?");
      if (!confirmed) return;
    }

    this.setState({
      proposalActionLoadingId: normalizedMessageId,
      proposalActionError: "",
      proposalActionErrorMessageId: "",
    });

    try {
      await this.chatService.confirmMeetupHandover({
        chatId,
        messageId: normalizedMessageId,
      });

      await this.loadMessages(chatId, { silent: true, preserveMessages: true });
      await this.loadChats({ preferredChatId: chatId, silent: true });
    } catch (e) {
      this.setState({
        proposalActionError: e?.message ?? "ยืนยันการส่งมอบสินค้าไม่สำเร็จ",
        proposalActionErrorMessageId: normalizedMessageId,
      });
    } finally {
      this.setState({ proposalActionLoadingId: "" });
    }
  };

  sendMessage = async (e) => {
    e.preventDefault();
    const { selectedChatId, draftText, draftImageFile, draftVideoFile } = this.state;
    if (!safeText(selectedChatId)) return;

    this.setState({ sending: true, sendingError: "" });
    try {
      const { message } = await this.chatService.sendMessage({
        chatId: selectedChatId,
        text: draftText,
        imageFile: draftImageFile,
        videoFile: draftVideoFile,
      });

      this.setState((state) => ({
        draftText: "",
        draftImageFile: null,
        draftVideoFile: null,
        messages: message ? [...state.messages, message] : state.messages,
      }));

      if (!message) {
        await this.loadMessages(selectedChatId, { silent: true, preserveMessages: true });
      }

      await this.loadChats({ preferredChatId: selectedChatId, silent: true });
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

  openCounterpartProfile = () => {
    const activeChat = this.getActiveChat();
    if (!activeChat) return;

    const currentUserId = safeText(this.props.user?.id);
    const fallbackCounterpartId =
      safeText(activeChat?.ownerId) === currentUserId
        ? safeText(activeChat?.buyerId)
        : safeText(activeChat?.ownerId);
    const counterpartId = safeText(activeChat?.counterpartId) || fallbackCounterpartId;

    if (!counterpartId) return;
    this.props.onOpenPublicUserProfile?.(counterpartId);
  };

  openImageLightbox = ({ imageUrl, alt } = {}) => {
    const normalizedUrl = safeText(imageUrl);
    if (!normalizedUrl) return;

    this.setState({
      lightboxImageUrl: normalizedUrl,
      lightboxImageAlt: safeText(alt) || "chat-image",
    });
  };

  closeImageLightbox = () => {
    this.setState({
      lightboxImageUrl: "",
      lightboxImageAlt: "",
    });
  };

  getActiveChat() {
    return this.state.chats.find((chat) => chat.id === this.state.selectedChatId) ?? null;
  }

  renderLeftPanel() {
    const { loadingChats, chatsError, chats, selectedChatId } = this.state;

    return (
      <section className="flex min-h-[68dvh] flex-col rounded-2xl bg-white p-4 shadow">
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
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto space-y-2 pr-1 hide-scrollbar">
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
      draftVideoFile,
      sending,
      sendingError,
      proposalActionLoadingId,
      proposalActionError,
      proposalActionErrorMessageId,
    } = this.state;
    const userId = this.props.user?.id ?? "";
    const activeChat = this.getActiveChat();
    const canSellerRespondMeetupProposal = safeText(activeChat?.ownerId) === safeText(userId);
    const canBuyerRespondMeetupProposal = Boolean(activeChat) && !canSellerRespondMeetupProposal;

    if (!activeChat) {
      return (
        <section className="flex min-h-[68dvh] items-center justify-center rounded-2xl bg-white p-6 text-center text-sm text-zinc-500 shadow md:sticky md:top-28 md:self-start md:h-[calc(100dvh-8.5rem)]">
          เลือกห้องแชทจากรายการด้านซ้ายเพื่อเริ่มพูดคุยกับร้านค้า
        </section>
      );
    }

    return (
      <section className="flex min-h-[68dvh] flex-col overflow-hidden rounded-2xl bg-white p-4 shadow md:sticky md:top-28 md:self-start md:h-[calc(100dvh-8.5rem)] md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-zinc-900 truncate">{activeChat.getDisplayName()}</div>
            <div className="text-xs text-zinc-500 truncate">สินค้า: {activeChat.getProductLabel()}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              onClick={this.openCounterpartProfile}
              disabled={!safeText(activeChat?.counterpartId) && !safeText(activeChat?.ownerId)}
            >
              ดูโปรไฟล์
            </button>
            <button
              type="button"
              className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              onClick={this.openProductFromActiveChat}
              disabled={!activeChat?.productId}
            >
              ดูสินค้า
            </button>
          </div>
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
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto space-y-2 pr-1 hide-scrollbar">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || `${message.chatId || activeChat.id}-${index}`}
                message={message}
                mine={message.isMine(userId)}
                avatarUrl={
                  safeText(message?.senderAvatarUrl) ||
                  (message.isMine(userId)
                    ? safeText(this.props.user?.avatarUrl)
                    : safeText(activeChat?.getDisplayAvatarUrl?.()))
                }
                avatarName={
                  message.isMine(userId)
                    ? safeText(this.props.user?.name || this.props.user?.email)
                    : safeText(message?.senderName || activeChat?.getDisplayName?.())
                }
                canSellerRespondMeetupProposal={canSellerRespondMeetupProposal}
                canBuyerRespondMeetupProposal={canBuyerRespondMeetupProposal}
                onRespondMeetupProposal={this.respondMeetupProposal}
                onConfirmMeetupHandover={this.confirmMeetupHandover}
                onOpenImage={this.openImageLightbox}
                responding={proposalActionLoadingId === message.id}
                actionError={
                  proposalActionErrorMessageId === message.id ? proposalActionError : ""
                }
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 min-h-0 flex-1" />
        )}

        <form className="sticky bottom-0 mt-4 border-t border-zinc-100 bg-white pt-3" onSubmit={this.sendMessage}>
          <div className="flex items-start gap-3">
            <ChatAvatar
              src={this.props.user?.avatarUrl}
              name={this.props.user?.name || this.props.user?.email}
              sizeClass="h-11 w-11"
              textClass="text-sm"
            />

            <div className="min-w-0 flex-1 space-y-2">
              <textarea
                className="w-full min-h-16 rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none"
                placeholder="พิมพ์ข้อความ..."
                value={draftText}
                onChange={(e) => this.setDraftText(e.target.value)}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                    แนบรูป
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => this.setDraftImageFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                    แนบวิดีโอ
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => this.setDraftVideoFile(e.target.files?.[0] ?? null)}
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
                  {draftVideoFile ? (
                    <button
                      type="button"
                      className="rounded-xl border border-zinc-200 px-2.5 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
                      onClick={this.clearDraftVideoFile}
                      title={draftVideoFile.name}
                    >
                      {draftVideoFile.name}
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
            </div>
          </div>
        </form>
      </section>
    );
  }

  render() {
    const { lightboxImageUrl, lightboxImageAlt } = this.state;

    return (
      <div className="app-chat-page min-h-dvh bg-zinc-50">
        <div className="app-topbar-shell sticky top-0 z-40 bg-[#A4E3D8] border-b border-zinc-200">
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
            <div className="font-semibold text-2xl gap-10">แชท</div>
          </div>
        </div>

        <div className="mx-auto max-w-375 px-4 py-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
            {this.renderLeftPanel()}
            {this.renderRightPanel()}
          </div>
        </div>

        {lightboxImageUrl ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6"
            onClick={this.closeImageLightbox}
          >
            <img
              src={lightboxImageUrl}
              alt={lightboxImageAlt || "chat-image"}
              className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : null}
      </div>
    );
  }
}

class ChatListItem extends React.Component {
  render() {
    const { chat, active, onClick } = this.props;
    const avatarUrl = chat.getDisplayAvatarUrl();
    const hasUnread = chat?.hasUnread?.() ?? false;
    const unreadBadgeLabel = chat?.getUnreadBadgeLabel?.() ?? "";

    return (
      <button
        type="button"
        className={`chat-list-item w-full rounded-xl border p-3 text-left ${
          active ? "border-amber-300 bg-[#F4D03E]/55" : "border-zinc-200 bg-white hover:bg-zinc-50"
        }`}
        onClick={onClick}
        aria-pressed={active}
      >
        <div className="flex items-start gap-2">
          <ChatAvatar
            src={avatarUrl}
            name={chat.getDisplayName()}
            sizeClass="h-10 w-10"
            textClass="text-xs"
          />

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                <div className="truncate text-sm font-semibold text-zinc-900">{chat.getDisplayName()}</div>
                <span
                  className={`min-w-[1.75rem] shrink-0 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none ${
                    hasUnread ? "bg-zinc-900 text-white opacity-100" : "opacity-0"
                  }`}
                  aria-hidden={!hasUnread}
                >
                  {hasUnread ? unreadBadgeLabel : "0"}
                </span>
              </div>
              <div className="w-14 shrink-0 text-right text-[10px] text-zinc-500">{chat.getUpdatedAtLabel()}</div>
            </div>
            <div className="truncate text-xs text-zinc-500">สินค้า: {chat.getProductLabel()}</div>
            <div className={`line-clamp-2 text-xs break-words ${hasUnread ? "font-semibold text-zinc-900" : "text-zinc-700"}`}>
              {chat.getLastMessagePreview()}
            </div>
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
      avatarUrl,
      avatarName,
      onOpenImage,
      canSellerRespondMeetupProposal,
      canBuyerRespondMeetupProposal,
      onRespondMeetupProposal,
      onConfirmMeetupHandover,
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
            canBuyerRespond={canBuyerRespondMeetupProposal}
            onRespond={onRespondMeetupProposal}
            onConfirmHandover={onConfirmMeetupHandover}
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
      <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
        {!mine ? <ChatAvatar src={avatarUrl} name={avatarName} sizeClass="h-9 w-9" textClass="text-xs" /> : null}
        <div className={`min-w-0 max-w-[min(78%,34rem)] rounded-2xl border px-3 py-2 space-y-2 ${bubbleClass}`}>
          {!mine ? <div className="text-[11px] font-semibold">{message.senderName || "ผู้ใช้"}</div> : null}
          {message.hasVideo() ? (
            <div className="rounded-xl overflow-hidden border border-black/10 bg-black/5">
              <video
                src={message.videoUrl}
                controls
                preload="metadata"
                className="max-h-72 w-full rounded-xl bg-black object-contain"
              />
            </div>
          ) : null}
          {message.hasImage() ? (
            <ChatMediaImage
              src={message.imageUrl}
              alt={message.senderName || "chat-image"}
              onOpenImage={onOpenImage}
            />
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
        : status === "awaiting_buyer_confirmation"
          ? "border-sky-200 bg-sky-50 text-sky-700"
        : status === "countered_by_seller"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : status === "cancelled_by_seller" || status === "rejected_by_buyer"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-amber-200 bg-amber-50 text-amber-700";

    return <div className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>{label}</div>;
  }

  render() {
    const { message, mine, canSellerRespond, canBuyerRespond, onConfirmHandover, responding, error } = this.props;
    const { editingCounterLocation, counterLocation } = this.state;
    const proposalStatus = message?.getMeetupProposalStatus?.() ?? "";
    const proposalLocation = message?.meetupProposal?.location ?? "";
    const responseLocation = message?.meetupProposal?.responseLocation ?? "";
    const canSellerAct = canSellerRespond && proposalStatus === "pending_seller_response";
    const canBuyerAct = canBuyerRespond && proposalStatus === "countered_by_seller";
    const canSellerConfirmHandover = canSellerRespond && proposalStatus === "awaiting_meetup";
    const canAct = canSellerAct || canBuyerAct;

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
            {canSellerRespond
              ? "ยืนยันสถานที่นัดรับเรียบร้อยแล้ว หลังส่งมอบสินค้าแล้วกดปุ่มส่งมอบแล้วเพื่อแจ้งผู้ซื้อ"
              : "ยืนยันสถานที่นัดรับเรียบร้อยแล้ว สถานะตอนนี้คือรอนัดพบ"}
          </div>
        ) : null}

        {proposalStatus === "awaiting_buyer_confirmation" ? (
          <div className={`text-xs ${mine ? "text-zinc-300" : "text-zinc-500"}`}>
            คนขายแจ้งว่าส่งมอบสินค้าแล้ว ตอนนี้รอผู้ซื้อยืนยันรับของเพื่อปิดธุรกรรม
          </div>
        ) : null}

        {proposalStatus === "countered_by_seller" ? (
          <div className={`text-xs ${mine ? "text-zinc-300" : "text-zinc-500"}`}>
            {canBuyerRespond
              ? "คนขายได้เสนอเปลี่ยนสถานที่นัดรับแล้ว กรุณายืนยันสถานที่ เปลี่ยนสถานที่ หรือยกเลิกคำสั่งซื้อ"
              : "คนขายได้เสนอเปลี่ยนสถานที่นัดรับแล้ว สามารถคุยรายละเอียดต่อในแชทนี้ได้"}
          </div>
        ) : null}

        {proposalStatus === "cancelled_by_seller" ? (
          <div className={`text-xs ${mine ? "text-zinc-300" : "text-zinc-500"}`}>
            คนขายยกเลิกการนัดรับแล้ว หากต้องการดำเนินการต่อให้คุยรายละเอียดใหม่ในแชท
          </div>
        ) : null}

        {proposalStatus === "rejected_by_buyer" ? (
          <div className={`text-xs ${mine ? "text-zinc-300" : "text-zinc-500"}`}>
            ผู้ซื้อยกเลิกคำสั่งซื้อนี้แล้ว
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
                  {canBuyerAct ? "ยืนยันสถานที่นัดรับ" : "ยอมรับข้อเสนอ"}
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                    mine ? "border border-white/20 text-white" : "border border-zinc-200 text-zinc-700"
                  }`}
                  onClick={this.openCounterEditor}
                  disabled={responding}
                >
                  {canBuyerAct ? "เปลี่ยนสถานที่" : "เปลี่ยนสถานที่รับและส่ง"}
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  onClick={() => this.submitAction("cancel")}
                  disabled={responding}
                >
                  {canBuyerAct ? "ยกเลิกการสั่งซื้อ" : "ยกเลิกการนัดรับ"}
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

        {canSellerConfirmHandover ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              onClick={() => onConfirmHandover?.({ messageId: message?.id })}
              disabled={responding}
            >
              ส่งมอบแล้ว
            </button>
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
