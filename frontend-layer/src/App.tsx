import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState } from "react";
import "./App.css";

// ------------------------------------
// BACKEND API CONFIGURATION
// ------------------------------------

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api/chat`;

// ------------------------------------
// TYPESCRIPT INTERFACES
// ------------------------------------

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

interface ChatResponse {
  success: boolean;
  data?: {
    reply: string;
  };
  error?: string;
}

// ------------------------------------
// SUGGESTION CARDS
// ------------------------------------

const suggestions = [
  {
    icon: "✦",
    title: "Brainstorm ideas",
    prompt: "Help me brainstorm creative ideas for a new project."
  },
  {
    icon: "⌘",
    title: "Write something",
    prompt: "Help me write a clear and engaging introduction."
  },
  {
    icon: "⌁",
    title: "Explain a concept",
    prompt: "Explain a complex concept in simple terms with an example."
  },
  {
    icon: "⌘",
    title: "Code with me",
    prompt: "Help me understand and solve a programming problem."
  }
];

// ------------------------------------
// ICON COMPONENT
// ------------------------------------

interface IconProps {
  name: string;
  size?: number;
}

function Icon({ name, size = 18 }: IconProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const
  };

  const icons: Record<string, React.ReactNode> = {
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),

    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),

    menu: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </>
    ),

    chat: (
      <>
        <path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9 9 0 0 1-4-.9L3 21l1.9-4.4A8.5 8.5 0 1 1 21 11.5Z" />
      </>
    ),

    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
      </>
    ),

    spark: (
      <>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
      </>
    )
  };

  return (
    <svg {...commonProps}>
      {icons[name] || icons.spark}
    </svg>
  );
}

// ------------------------------------
// MAIN APP COMPONENT
// ------------------------------------

function App() {

  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ------------------------------------
  // AUTO SCROLL TO LATEST MESSAGE
  // ------------------------------------

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  // ------------------------------------
  // AUTO RESIZE TEXTAREA
  // ------------------------------------

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";

      textareaRef.current.style.height =
        `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  // ------------------------------------
  // CREATE NEW CHAT
  // ------------------------------------

  const startNewChat = () => {
    setMessages([]);
    setInput("");
    setError("");
    setActiveConversation(null);

    textareaRef.current?.focus();
  };

  // ------------------------------------
  // SELECT OLD CONVERSATION
  // ------------------------------------

  const selectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation.id);

    setMessages(conversation.messages);

    setError("");
  };

  // ------------------------------------
  // SEND MESSAGE TO BACKEND
  // ------------------------------------

  const sendMessage = async (value: string = input) => {

    const text = value.trim();

    if (!text || loading) {
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: text
    };

    const updatedMessages = [
      ...messages,
      userMessage
    ];

    setMessages(updatedMessages);

    setInput("");

    setError("");

    setLoading(true);

    try {

      // Send request to Express backend

      const response = await fetch(API_URL, {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          message: text,

          history: messages.map(({ role, content }) => ({
            role,
            content
          }))

        })

      });

      // Read backend response

      const payload: ChatResponse = await response.json();

      if (!response.ok || !payload.success) {

        throw new Error(
          payload.error || `Request failed (${response.status})`
        );

      }

      // Get AI response

      const assistantMessage: Message = {

        role: "assistant",

        content:
          payload.data?.reply ||
          "I couldn't generate a response. Please try again."

      };

      const finalMessages = [

        ...updatedMessages,

        assistantMessage

      ];

      setMessages(finalMessages);

      // Create conversation ID

      const conversationId =
        activeConversation || crypto.randomUUID();

      setActiveConversation(conversationId);

      // Save conversation in React state

      const title =
        text.length > 34
          ? `${text.slice(0, 34)}...`
          : text;

      setConversations((previous) => {

        const existing = previous.find(
          (item) => item.id === conversationId
        );

        if (existing) {

          return previous.map((item) =>
            item.id === conversationId
              ? {
                  ...item,
                  messages: finalMessages
                }
              : item
          );

        }

        return [

          {
            id: conversationId,
            title,
            messages: finalMessages
          },

          ...previous

        ];

      });

    } catch (err) {

      console.error("Chat error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );

    } finally {

      setLoading(false);

      textareaRef.current?.focus();

    }

  };

  // ------------------------------------
  // ENTER KEY TO SEND MESSAGE
  // ------------------------------------

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  };

  // ------------------------------------
  // COPY AI RESPONSE
  // ------------------------------------

  const copyMessage = async (content: string) => {

    try {

      await navigator.clipboard.writeText(content);

    } catch {

      setError(
        "Clipboard access is unavailable in this browser."
      );

    }

  };

  // ------------------------------------
  // CLEAR CONVERSATION
  // ------------------------------------

  const clearConversation = () => {

    if (!activeConversation) {

      startNewChat();

      return;

    }

    setConversations((previous) =>
      previous.filter(
        (item) => item.id !== activeConversation
      )
    );

    startNewChat();

  };

  // ------------------------------------
  // FRONTEND UI
  // ------------------------------------

  return (

    <main className="app-shell">

      {/* SIDEBAR */}

      <aside
        className={`sidebar ${
          sidebarOpen
            ? "sidebar-open"
            : "sidebar-closed"
        }`}
      >

        <div className="brand-row">

          <div className="brand-mark">
            <Icon name="spark" size={21} />
          </div>

          <span className="brand-name">
            nova<span>.</span>
          </span>

          <button
            className="icon-button sidebar-toggle"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <Icon name="menu" />
          </button>

        </div>

        {/* NEW CHAT BUTTON */}

        <button
          className="new-chat-button"
          onClick={startNewChat}
        >

          <Icon name="plus" size={17} />

          <span>New conversation</span>

          <span className="shortcut">⌘ K</span>

        </button>

        <div className="sidebar-label">
          YOUR SPACE
        </div>

        {/* CONVERSATION HISTORY */}

        <nav
          className="conversation-list"
          aria-label="Recent conversations"
        >

          {conversations.length === 0 ? (

            <div className="empty-history">
              Your conversations will appear here.
            </div>

          ) : (

            conversations.map((conversation) => (

              <button
                key={conversation.id}
                className={`history-item ${
                  activeConversation === conversation.id
                    ? "history-active"
                    : ""
                }`}
                onClick={() =>
                  selectConversation(conversation)
                }
              >

                <Icon name="chat" size={16} />

                <span>{conversation.title}</span>

              </button>

            ))

          )}

        </nav>

        {/* PROFILE */}

        <div className="sidebar-bottom">

          <div className="profile-avatar">
            N
          </div>

          <div className="profile-copy">

            <strong>Nova AI</strong>

            <span>Personal workspace</span>

          </div>

          <span
            className="online-dot"
            title="Ready"
          />

        </div>

      </aside>

      {/* SIDEBAR OPEN BUTTON */}

      {!sidebarOpen && (

        <button
          className="floating-menu icon-button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >

          <Icon name="menu" />

        </button>

      )}

      {/* MAIN PANEL */}

      <section className="main-panel">

        {/* TOP NAVIGATION */}

        <header className="topbar">

          <div className="topbar-left">

            <span className="topbar-title">
              AI Assistant
            </span>

            <span className="model-pill">

              <span className="model-dot" />

              Nova 1.0

            </span>

          </div>

          <div className="topbar-right">

            <span className="status-text">

              <span className="online-dot" />

              All systems normal

            </span>

            <button
              className="icon-button"
              onClick={clearConversation}
              aria-label="Clear conversation"
              title="Clear conversation"
            >

              <Icon name="trash" size={17} />

            </button>

          </div>

        </header>

        {/* CHAT AREA */}

        <div className="chat-scroll-area">

          {/* WELCOME SCREEN */}

          {messages.length === 0 ? (

            <div className="welcome-screen">

              <div className="welcome-orbit">

                <div className="orbit orbit-one" />

                <div className="orbit orbit-two" />

                <div className="welcome-core">

                  <Icon name="spark" size={34} />

                </div>

                <span className="orbit-star star-one">
                  ✦
                </span>

                <span className="orbit-star star-two">
                  ✧
                </span>

              </div>

              <div className="eyebrow">

                <span />

                YOUR IDEAS, IN MOTION

              </div>

              <h1>
                What can I help
                <br />
                <em>you discover?</em>
              </h1>

              <p className="welcome-description">

                A little curiosity can lead somewhere brilliant.
                <br />

                Ask a question, explore an idea, or make something new.

              </p>

              {/* SUGGESTION CARDS */}

              <div className="suggestion-grid">

                {suggestions.map((suggestion) => (

                  <button
                    className="suggestion-card"
                    key={suggestion.title}
                    onClick={() =>
                      sendMessage(suggestion.prompt)
                    }
                  >

                    <span className="suggestion-icon">
                      {suggestion.icon}
                    </span>

                    <span className="suggestion-title">
                      {suggestion.title}
                    </span>

                    <span className="suggestion-prompt">
                      {suggestion.prompt}
                    </span>

                    <span className="suggestion-arrow">
                      ↗
                    </span>

                  </button>

                ))}

              </div>

            </div>

          ) : (

            /* CHAT MESSAGES */

            <div className="message-list">

              <div className="conversation-date">
                TODAY · LET'S MAKE SOMETHING GREAT
              </div>

              <div className="assistant-intro">

                <div className="mini-mark">

                  <Icon name="spark" size={16} />

                </div>

                <span>
                  Hi there! I'm Nova, your AI companion.
                  What would you like to explore today?
                </span>

              </div>

              {messages.map((message, index) => (

                <article
                  className={`message-row ${message.role}`}
                  key={`${index}-${message.role}`}
                >

                  {/* ASSISTANT AVATAR */}

                  {message.role === "assistant" && (

                    <div className="message-avatar">

                      <Icon name="spark" size={16} />

                    </div>

                  )}

                  <div className="message-content">

                    <div className="message-author">

                      {message.role === "user"
                        ? "You"
                        : "Nova"}

                    </div>

                    <div className="message-bubble">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                         {message.content}
                      </ReactMarkdown>
                    </div>

                    {/* COPY BUTTON */}

                    {message.role === "assistant" && (

                      <button
                        className="copy-button"
                        onClick={() =>
                          copyMessage(message.content)
                        }
                      >

                        Copy response

                      </button>

                    )}

                  </div>

                  {/* USER AVATAR */}

                  {message.role === "user" && (

                    <div className="user-avatar">
                      Y
                    </div>

                  )}

                </article>

              ))}

              {/* TYPING INDICATOR */}

              {loading && (

                <div className="message-row assistant">

                  <div className="message-avatar">

                    <Icon name="spark" size={16} />

                  </div>

                  <div className="message-content">

                    <div className="message-author">
                      Nova
                    </div>

                    <div className="typing-bubble">

                      <i />
                      <i />
                      <i />

                      <span>
                        Thinking through it
                      </span>

                    </div>

                  </div>

                </div>

              )}

              <div ref={bottomRef} />

            </div>

          )}

        </div>

        {/* MESSAGE INPUT */}

        <div className="composer-wrap">

          {/* ERROR MESSAGE */}

          {error && (

            <div className="error-message">

              <span>!</span>

              {error}

              <button
                onClick={() => setError("")}
              >
                Dismiss
              </button>

            </div>

          )}

          <div className="composer">

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Message Nova..."
              rows={1}
              aria-label="Message Nova"
            />

            <div className="composer-footer">

              <div className="composer-hint">

                <span className="hint-spark">
                  ✧
                </span>

                Be curious. Be specific. Be you.

              </div>

              <div className="composer-actions">

                <span className="enter-hint">
                  ↵ to send
                </span>

                <button
                  className="send-button"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                >

                  <Icon name="send" size={17} />

                </button>

              </div>

            </div>

          </div>

          <p className="disclaimer">

            Nova can make mistakes. Check important information.

          </p>

        </div>

      </section>

    </main>

  );

}

export default App;
