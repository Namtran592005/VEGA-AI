import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Cookies from 'js-cookie';
import { Sun, Moon, Volume2, VolumeX, Send, Image, Trash2, Info, List, X, PlusCircle, Shuffle, Globe, AlertTriangle, Edit, RefreshCcw, FileText, Settings, Save, RotateCcw, Copy, Trash, Radio, File, CheckCircle, WifiOff } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { motion } from 'framer-motion';

// Google Gemini API Key
const googleGenAI = new GoogleGenerativeAI("AIzaSyDhadJt9dZSF0k9bVfI_Dc18JUYgbpbN7U");

// --- Keyframes ---
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

// --- Styled Components --- (Moved to BEFORE the App component)

const AppContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${props => props.darkMode ? 'linear-gradient(to bottom, #1a1a1a, #0d0d0d)' : 'linear-gradient(to bottom, #f8f9fa, #e9ecef)'};
  color: ${props => props.darkMode ? '#fff' : '#212529'};
  transition: all 0.3s ease;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
  position: relative;
  padding: 0 2rem;

  @media (max-width: 768px) {
    padding: 0 1rem;
  }

  ${props => !props.isOnline && `
    filter: blur(5px);
    pointer-events: none;
  `}
`;

const OfflineOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  color: white;
  font-size: 1.5rem;
  flex-direction: column;
  gap: 1rem;
`;

const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 1rem;
  border-bottom: 1px solid ${props => props.darkMode ? '#333' : '#ddd'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: ${fadeIn} 0.5s ease;
  z-index: 1000;
  background: ${props => props.darkMode ? 'rgba(45, 45, 45, 0.95)' : 'rgba(248, 249, 250, 0.95)'};
  backdrop-filter: blur(10px);
   @media (max-width: 768px) {
    padding: 0.5rem;
  }
`;

const ChatArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-top: 80px;
  padding-bottom: 80px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 10;

  &::-webkit-scrollbar {
    width: 8px;
     @media (max-width: 768px) {
      width: 4px;
     }
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.darkMode ? '#4a4a4a' : '#cbd5e0'};
    border-radius: 4px;
    &:hover {
      background: ${props => props.darkMode ? '#5a5a5a' : '#b0bec5'};
    }
  }
  @media (max-width: 768px) {

    padding-top: 60px;
    padding-bottom: 60px;
  }
`;

const Message = styled.div`
  max-width: 85%;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background: ${props => props.isUser ? '#007bff' : props.darkMode ? '#333' : '#fff'};
  color: ${props => props.isUser ? '#fff' : props.darkMode ? '#fff' : '#212529'};
  padding: 0.8rem 1rem;
  border-radius: 1.25rem;
  box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
  position: relative;
  animation: ${slideUp} 0.4s ease;
  transition: all 0.2s ease;
  word-wrap: break-word;
  white-space: pre-wrap;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2), 0 5px 15px rgba(0,0,0,0.25);
    .message-actions {
      opacity: ${props => (props.isEditing ? 0 : 1)};
    }
  }

  ${props => props.isError && `
    &:hover {
      transform: none;
      box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
    }
  `}

  ${props => !props.isUser && !props.isError && `
    border: 1px solid ${props => props.darkMode ? '#444' : '#eee'};
  `}

  ${props => props.isError && `
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  `}

  @media (max-width: 768px) {
    max-width: 95%;
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
  }

  .message-actions {
    position: absolute;
    bottom: 0.4rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
    opacity: 0;
    transition: opacity: 0.2s ease;

    & > button {
      padding: 0.1rem 0.2rem;
      background-color: transparent;
    }
  }

  .timestamp {
    font-size: 0.55rem;
    opacity: 0.7;
    margin-bottom: 0.6rem;
    margin-left: 0.5rem;
    position: absolute;
    bottom: 0;
    left: 0;
  }

  .editable-content {
    padding: 0.25rem;
    border: 1px dashed transparent;
    border-radius: 4px;
    cursor: text;

    &:focus {
      outline: none;
      border-color: ${props => props.darkMode ? "#fff" : '#888'};
    }
  }
`;

const InputArea = styled.form`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 1rem;
  border-top: 1px solid ${props => props.darkMode ? '#2d2d2d' : '#dee2e6'};
  z-index: 1000;
  background: ${props => props.darkMode ? 'rgba(45, 45, 45, 0.95)' : 'rgba(248, 249, 250, 0.95)'};
  backdrop-filter: blur(10px);
    @media (max-width: 768px) {
        padding: 0.5rem;
  }
`;

const AttachmentIndicator = styled.div`
  position: absolute;
  bottom: 0.5rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.darkMode ? '#bbb' : '#777'};
  font-size: 0.8rem;

  .indicator-icon {
    margin-right: 0.25rem;
  }
`;

const Button = styled.button`
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin: 0 0.25rem;

  &:hover {
    background: ${props => props.darkMode ? '#2d2d2d' : '#e9ecef'};
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 102, 204, 0.3)'};
  }
   @media (max-width: 768px) {
        padding: 0.3rem;
        margin: 0 0.1rem;
    }
`;

const Input = styled.textarea`
  flex: 1;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid ${props => props.darkMode ? '#2d2d2d' : '#dee2e6'};
  background: ${props => props.darkMode ? '#2d2d2d' : '#fff'};
  color: inherit;
  font-size: 1rem;
  resize: vertical;
  min-height: 40px;
  max-height: 200px;
  margin-bottom: 0.25rem;

  &:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0,102,204,0.2);
  }
`;
const ModalOverlay = styled.div`
   position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;  /* Ensure it's above other fixed elements */
`;

const ModalContent = styled.div`
   background: ${props => props.darkMode ? '#333' : '#fff'};
   color: ${props => props.darkMode ? '#fff' : '#212529'};
   padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  max-width: 80%;
  max-height: 80vh;
    overflow-y: auto;
   position: relative;
   @media(max-width: 768px){
     max-width: 95%;
     padding: 1rem;
     }
`;

const ChatListToolbar = styled.div`
 position: fixed;
  top: 0;
  left: ${props => props.show ? '0' : '-300px'};
  width: 300px;
  height: 100%;
  background: ${props => props.darkMode ? '#2d2d2d' : '#f8f9fa'};
  border-right: 1px solid ${props => props.darkMode ? '#444' : '#ddd'};
  transition: left: 0.3s ease;
  overflow-y: auto;
  z-index: 950;
   @media (max-width: 768px) {
        width: 100%;
        left: ${props => props.show ? '0' : '-100%'};
    }
`;

const ChatListItem = styled.div`
    padding: 1rem;
    border-bottom: 1px solid ${props => props.darkMode ? '#444' : '#ddd'};
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    &:hover {
        background: ${props => props.darkMode ? '#3a3a3a' : '#e9ecef'};
    }
    &.active {
        background: ${props => props.darkMode ? '#4a4a4a' : '#d1d8e0'};
        font-weight: bold;
    }
    @media (max-width:768px){
       padding: 0.75rem;
    }
`;
const TypingIndicator = styled.div`
  .typing-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.darkMode ? '#fff' : '#212529'};
    margin: 0 3px;
    animation: ${keyframes`
      0% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
      100% { transform: translateY(0); }
    `} 0.8s infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;
const BackgroundAnimation = styled(motion.div)`
   position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;

  .particle {
    position: absolute;
    border-radius: 50%;
    opacity: 0;

    background-color: ${props => props.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};

    animation: ${keyframes`
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 0.1;
        }
        100% {
          transform: translateY(-100vh) rotate(360deg);
          opacity: 0;
        }
      `} ${props => props.duration}s linear infinite;
  }
`;

const CloseButton = styled(Button)`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem;

`;
const ApiAlert = styled.div`
    padding: 1rem;
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    color: #856404;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;

    .icon {
        margin-right: 0.5rem;
    }
`
const ChatTitle = styled.div`
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 0.5rem;
`;

const CustomSettingsDrawer = styled.div`
  position: fixed;
  top: ${props => (props.show ? '49px' : '-400px')};
  right: 55px;
  width: 300px;
  background: ${props => props.darkMode ? '#333' : '#fff'};
  color: ${props => props.darkMode ? '#fff' : '#212529'};
  border: 1px solid ${props => props.darkMode ? '#555' : '#ddd'};
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  z-index: 1050;
  transition: top 0.3s ease;
  border-radius: 8px;
    @media (max-width: 768px) {
     width: 95%;
     right: 2.5%;
      top: ${props => props.show ? '40px' : '-400px'};

    }

    h3 {
        margin-bottom: 1rem;
        border-bottom: 1px solid ${props => props.darkMode ? '#555' : '#ddd'};
        padding-bottom: 0.5rem;
    }

    textarea {
        width: 100%;
        min-height: 100px;
        border: 1px solid ${props => props.darkMode ? '#555' : '#ddd'};
        border-radius: 0.5rem;
        padding: 0.5rem;
        margin-bottom: 1rem;
        background: ${props => props.darkMode ? '#444' : '#f9f9f9'};
        color: inherit;
        resize: vertical;
        @media(max-width: 768px){
            max-height: 200px;
            font-size: 0.9rem;
            min-height: 80px;
        }
    }
    button {
       margin-top: 0.5rem;
       margin-right: 0.2rem;
    }

    .buttons {
      display: flex;
      justify-content: space-between;

    }
`;

const ContactInfo = styled.div`
     .contact-item {
        display: flex;
       align-items: center;
        margin-bottom: 0.5rem;
     }

    .contact-label {
       font-weight: bold;
        margin-right: 0.5rem;
         width: 80px;
    }

   .contact-link {
      color: ${props => props.darkMode ? '#ADD8E6' : '#0000FF'};
      text-decoration: none;
     &:hover {
           opacity: 0.8;
         }
      }

`;

//New styles InfoModal (design again)
const InfoSection = styled.section`     /*Group the blocks by section (features/ contact)*/
  margin-bottom: 1.5rem;
    padding: 1rem;       /* Keep small space! */
  border-radius: 8px;
     background-color: ${props => props.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}; /*  helps sections visually distinct. */
  h3 {           /* Styles all the h3 in info section*/
   margin-bottom: 0.75rem;      /* reduce margin for better user interface*/
     font-size: 1.25rem;       /*  Keep headings readable. */
    border-bottom: 2px solid ${props => props.darkMode ? '#555' : '#ddd'};     /* Border avoid make info text together.*/
    padding-bottom: 0.25rem;     /* Some spaces*/
    }
 ul{
     list-style: disc;
    margin-left: 1.5rem;
     li{
      margin-bottom: 0.25rem;   /* Keeps it readables*/
     }
  }

`;
// Language Dropdown Styles
const LanguageDropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const LanguageDropdownButton = styled(Button)`
  // Use existing Button styles
`;

const LanguageDropdownContent = styled.div`
  position: absolute;
  top: 100%; /* Position below the button */
  right: 0;  /* Align to the right */
  background: ${props => props.darkMode ? '#2d2d2d' : '#fff'};
  border: 1px solid ${props => props.darkMode ? '#555' : '#ddd'};
  border-radius: 0.5rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  min-width: 80px; /* Set a minimum width */
  z-index: 1010; /* Ensure it's above other content, below modals */
  overflow: hidden; /* Prevent content overflow */

  button {
    display: block; /* Each language on a new line */
    width: 100%;    /* Full width of the dropdown */
    padding: 0.5rem;
    text-align: left;
    background: none;
    border: none;
    border-bottom: 1px solid ${props => props.darkMode ? '#444' : '#eee'};
    color: inherit;
    cursor: pointer;
        font-size: 0.875rem; /* Match other text */


    &:last-child {
      border-bottom: none; /* No border on the last item */
    }

    &:hover {
      background: ${props => props.darkMode ? '#3a3a3a' : '#f0f0f0'};
    }
    &:focus{
        outline: none; /* Remove default focus style */
     }
  }
`;

function App() {
   // --- State Variables ---
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [language, setLanguage] = useState('vi');  // Current language
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiAlert, setShowApiAlert] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const [model, setModel] = useState('google');
  const [isOnline, setIsOnline] = useState(navigator.onLine); // Add online status
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false); // Dropdown visibility

  // --- Chat-Related State --- (No changes)
  const [chats, setChats] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [tempEditContent, setTempEditContent] = useState("");
  const [customInstructions, setCustomInstructions] = useState({});
  const [showCustomSettings, setShowCustomSettings] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [liveChatEnabled, setLiveChatEnabled] = useState(false);

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const imageInputRef = useRef(null);
  const textInputRef = useRef(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const botName = "VEGA";

    // --- Utility Functions ---

    const playSound = (soundFile) => {
        if (audioRef.current) {
            audioRef.current.src = soundFile;
            audioRef.current.play().catch(error => {
                console.warn("Audio play failed:", error);
            });
        }
    };

    // --- Language Handling ---
     // Define the language options
   const languageOptions = [
    { code: 'vi', name: 'VI', voice: 'vi-VN' },
    { code: 'en', name: 'EN', voice: 'en-US' },
    { code: 'ko', name: 'KO', voice: 'ko-KR' }, // Korean
    { code: 'ja', name: 'JA', voice: 'ja-JP' }, // Japanese
  ];

    const getLanguageName = (code) => {
     const lang = languageOptions.find((l) => l.code === code);
     return lang ? lang.name : 'Unknown'; // Return 'Unknown' if not found
  };
  const getVoiceByCode = (code) => {
      return languageOptions.find((lang) => lang.code === code)?.voice;
    }
    // Updated speak function
     const speak = useCallback((text, langCode = language) => { // Use language code now
      if (soundEnabled && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getVoiceByCode(langCode) || 'en-US'; // Fallback to en-US
        const voices = window.speechSynthesis.getVoices();

        if (voices.length > 0) {
          const preferredVoice = voices.find(voice => voice.lang === utterance.lang && voice.localService);
          utterance.voice = preferredVoice || voices[0]; // Use preferred, or any voice
           }

        window.speechSynthesis.speak(utterance);
    }
}, [soundEnabled, language]);


 // --- useEffect Hooks ---

  // Online/Offline Event Listeners (No changes)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


     useEffect(() => {
    const savedChats = Cookies.get('chatHistory');
    let initialChats = {};
    let initialChatId = null;

    if (savedChats) {
        try {
            initialChats = JSON.parse(savedChats);
            const chatIds = Object.keys(initialChats);
            if (chatIds.length > 0) {
                initialChatId = chatIds[chatIds.length - 1]; // Select the last chat
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            // If there's an error parsing, it's safer to start fresh
            initialChats = {};
            initialChatId = null;
        }
    }

    // If no saved chats, or if loading failed, create a new chat
    if (!initialChatId) {
        initialChatId = `chat_${Date.now()}`;
        initialChats[initialChatId] = {
            title: language === 'vi' ? 'Cuộc trò chuyện mới' : 'New Chat',
            messages: []
        };
    }

    setChats(initialChats);
    setCurrentChatId(initialChatId);


    // Load other settings (model, language, sound, custom instructions)
    const savedModel = Cookies.get('selectedModel');
    setModel(savedModel || 'google');

     // Load saved language, defaulting to 'vi' if not found
    const savedLanguage = Cookies.get('selectedLanguage');
   setLanguage(savedLanguage || 'vi');


    const savedSoundEnabled = Cookies.get('soundEnabled');
    if (savedSoundEnabled !== undefined) {
        setSoundEnabled(savedSoundEnabled === 'true');
    }

    const savedCustomInstructions = Cookies.get('customInstructions');
    if (savedCustomInstructions) {
        try {
            setCustomInstructions(JSON.parse(savedCustomInstructions));
        } catch (error) {
            console.error("Error loading custom instruction", error);
        }
    }
}, [language]);  //  Include 'language' in the dependency array

    useEffect(() => {
        if (Object.keys(chats).length > 0) {
            Cookies.set('chatHistory', JSON.stringify(chats), { expires: 7 });
        }
        Cookies.set('selectedModel', model);
        Cookies.set('selectedLanguage', language);  // Save the selected language
        Cookies.set('soundEnabled', soundEnabled);
        Cookies.set('customInstructions', JSON.stringify(customInstructions));

    }, [chats, model, language, soundEnabled, customInstructions]); // Include language


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chats, currentChatId]);
     // --- Chat Management Functions --- (No changes from previous version)
   const createNewChat = () => {
        const newChatId = `chat_${Date.now()}`;
        setChats(prevChats => ({
            ...prevChats,
            [newChatId]: {
                title: language === 'vi' ? 'Cuộc trò chuyện mới' : 'New Chat',
                messages: []
            },
        }));
        setCurrentChatId(newChatId);
        setShowChatList(false); // Hide the chat list after creating
    };



    const deleteChat = (chatId) => {
        setChats(prevChats => {
            const updatedChats = { ...prevChats };
            delete updatedChats[chatId];
            // After deleting, select the *first* available chat, if any.
            const chatIds = Object.keys(updatedChats);
            const newCurrentChatId = chatIds.length > 0 ? chatIds[0] : null;
            setCurrentChatId(newCurrentChatId);
            return updatedChats;
        });

        // If we just deleted the last chat, remove the cookie
        if (Object.keys(chats).length === 1) {
            Cookies.remove('chatHistory');
        }
    };

    const startRenameChat = (chatId) => {
        setEditingChatId(chatId);
        setNewChatTitle(chats[chatId].title);
    };

    const confirmRenameChat = (chatId) => {
        if (newChatTitle.trim()) {
            setChats(prevChats => ({
                ...prevChats,
                [chatId]: {
                    ...prevChats[chatId],
                    title: newChatTitle.trim(),
                },
            }));
        }
        setEditingChatId(null);
        setNewChatTitle('');
    };

    const cancelRenameChat = () => {
        setEditingChatId(null);
        setNewChatTitle('');
    };

   const selectChat = (chatId) => {
        setCurrentChatId(chatId);
        setShowChatList(false); // Hide chat list after selection
        setEditingChatId(null); // Clear any editing state
        setNewChatTitle('');
    };

  // Function to set the language and hide the dropdown
    const setAppLanguage = (langCode) => {
        setLanguage(langCode);
        setShowLanguageDropdown(false); // Hide dropdown after selection
    };

    // --- Message Handling Functions --- (No changes from previous version)
      const searchMessages = (searchTerm, chatMessages) => {
        if (!searchTerm) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        return chatMessages.filter(message =>
            message.content.toLowerCase().includes(lowerSearchTerm)
        );
    };

    const preparePrompt = (userMessageContent, image = null, fileContent = null, isRegeneration = false) => {
        let modelToUse, prompt;
        const currentChat = chats[currentChatId];
        let previousMessages = [];

        // Construct previous messages based on whether it's a regeneration or not.
        if (currentChat) {
            const messageSource = isRegeneration ? currentChat.messages : currentChat.messages.slice(0, -1);
            previousMessages = messageSource.map(msg => ({
                role: msg.isUser ? 'user' : 'model',
                parts: msg.image
                    ? [msg.image.prompt, { inlineData: { data: msg.image.data.split(',')[1], mimeType: msg.image.data.split(';')[0].split(':')[1] } }]
                    : (msg.file ? [msg.file.prompt, msg.file.content] : msg.content)
            }));
        }


        // Determine        // the model and construct the prompt.
          if (image) {
            modelToUse = googleGenAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });
            // Simplified prompt construction for image
            prompt = [
                language === 'vi' ? "Hãy mô tả chi tiết và chính xác nhất có thể bằng tiếng Việt:" :
                language === 'ko' ? "가능한 한 자세하고 정확하게 설명해주세요:" :
                language === 'ja' ? "できるだけ詳細かつ正確に説明してください:" :
                "Describe it in as much detail and as accurately as possible:",
                userMessageContent,
                { inlineData: { data: image.split(',')[1], mimeType: image.split(';')[0].split(':')[1] } }
            ];

        } else if (fileContent) {
            modelToUse = googleGenAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });
            // Simplified file content prompt
            prompt = language === 'vi' ? `Đây là nội dung từ một file và yêu cầu, hãy xử lý và trả lời bằng tiếng Việt:\n\n${userMessageContent}\n\n${fileContent}`
              : language === 'ko' ? `파일 내용과 요청 사항입니다. 처리하고 응답해 주세요:\n\n${userMessageContent}\n\n${fileContent}`
              : language === 'ja' ? `ファイルの内容とリクエストです。処理して応答してください:\n\n${userMessageContent}\n\n${fileContent}`
              : `Here is content from a file and a query, process and respond:\n\n${userMessageContent}\n\n${fileContent}`;
        }
        else {
            modelToUse = googleGenAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });
            const customPrompt = customInstructions[currentChatId] || "";
            // Multi-language prompt
            if (language === 'vi') {
                prompt = `${customPrompt}\nBạn là ${botName}.  Đây là các tin nhắn trước:\n${JSON.stringify(previousMessages)}\nHãy trả lời tin nhắn cuối, một cách chi tiết và chính xác nhất có thể:\n\n${userMessageContent}`;
            } else if (language === 'ko') {                prompt = `${customPrompt}\n당신은 ${botName}입니다.  이전 메시지는 다음과 같습니다:\n${JSON.stringify(previousMessages)}\n마지막 메시지에 최대한 자세하고 정확하게 응답하세요:\n\n${userMessageContent}`;
            } else if (language === 'ja') {
                prompt = `${customPrompt}\nあなたは${botName}です。  以前のメッセージは次のとおりです:\n${JSON.stringify(previousMessages)}\n最後のメッセージにできるだけ詳細かつ正確に返信してください:\n\n${userMessageContent}`;
            } else { // Default to English
                prompt = `${customPrompt}\nYou are ${botName}. These are the previous messages:\n${JSON.stringify(previousMessages)}\nRespond to the last message in a detailed and accurate as possible:\n\n${userMessageContent}`;
            }
          }
        return { model: modelToUse, prompt };
    };

 const regenerateResponse = async (chatId, messageIndex) => {
    if (!chats[chatId] || messageIndex < 0 || messageIndex >= chats[chatId].messages.length) {
        console.warn("Invalid chat ID or message index for regeneration.");
        return;
    }

       setIsLoading(true);

    try {
        // Use preparePrompt with isRegeneration set to true.  Get the *previous* message's content.
        const { model, prompt } = preparePrompt(chats[chatId].messages[messageIndex-1].content , null ,null, true);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          let botResponseText = response.text();

           // Normalize newlines in the response

          botResponseText = botResponseText.replace(/(\n\s*){2,}/g, '\n'); // Replaced with single newline
          botResponseText = botResponseText.replace(/(\n\s*\n)/g, '\n');   // Ensure consistent single newlines


        setChats(prevChats => {
            const updatedMessages = [...prevChats[chatId].messages];
            updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], content: botResponseText };           return {
              ...prevChats,
            [chatId] : {
                 ...prevChats[chatId],
               messages: updatedMessages
              }
       };

      });
      speak(botResponseText, language); // Pass the current language to speak

      }catch(error){
           console.error("Error regenerating response: ", error);
        let errorMessageContent = "";
        // Multi-language error messages
        if (language === 'vi') {
            if (error.message.includes("400")) {
                errorMessageContent = "Lỗi 400: Yêu cầu không hợp lệ. Đảm bảo API Key của bạn là chính xác và tin nhắn không quá dài hoặc có nội dung không phù hợp.";
            } else if (error.message.includes("429")) {
                errorMessageContent = "Lỗi 429: Giới hạn API. Bạn đã gửi quá nhiều tin nhắn trong một khoảng thời gian ngắn. Hãy thử lại sau.";
            } else if (error.message.includes("500")) {
                errorMessageContent = "Lỗi 500: Lỗi máy chủ nội bộ. Đội ngũ của Google đã được thông báo. Hãy thử lại sau.";
            } else {
                errorMessageContent = "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.";
            }
        } else if (language === 'ko') {
             if (error.message.includes("400")) {
                errorMessageContent = "오류 400: 잘못된 요청입니다. API 키가 올바른지, 메시지가 너무 길거나 부적절한 내용을 포함하고 있지 않은지 확인하세요.";
            } else if (error.message.includes("429")) {
                errorMessageContent = "오류 429: API 제한입니다. 짧은 시간에 너무 많은 메시지를 보냈습니다. 잠시 후 다시 시도하세요.";
            } else if (error.message.includes("500")) {
                errorMessageContent = "오류 500: 내부 서버 오류입니다. Google에 알림이 전송되었습니다. 나중에 다시 시도하세요.";
            } else {
                errorMessageContent = "죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.";
            }
        } else if (language === 'ja') {
            if (error.message.includes("400")) {
                errorMessageContent = "エラー400: 不正なリクエストです。APIキーが正しいこと、メッセージが長すぎたり不適切な内容を含んでいないことを確認してください。";
            } else if (error.message.includes("429")) {
                errorMessageContent = "エラー429: API制限です。短時間にメッセージを送信しすぎました。しばらくしてからもう一度お試しください。";
            } else if (error.message.includes("500")) {
                errorMessageContent = "エラー500: 内部サーバーエラーです。Googleに通知されました。後でもう一度お試しください。";
            } else {
                errorMessageContent = "申し訳ありません。エラーが発生しました。もう一度お試しください。";
            }
        } else { // Default to English
            if (error.message.includes("400")) {
                errorMessageContent = "Error 400: Bad Request. Make sure your API key is correct and the message isn't too long or contain inappropriate content.";
            } else if (error.message.includes("429")) {
                errorMessageContent = "Error 429: API limit, too many messages in short time. Please wait before retrying.";
            } else if (error.message.includes("500")) {
                errorMessageContent = "Error 500: Internal Server Error. Google has been notified. Please try again later.";
            } else {
                errorMessageContent = "Sorry, an error occurred. Please try again.";
            }
        }


                       const errorMessage = {
                              content: errorMessageContent,
                              timestamp: new Date().toLocaleTimeString(),
                              isUser: false,
                               isError: true,
                              };

          setChats(prevChats => {
              const updatedMessages = [...prevChats[chatId].messages];
               updatedMessages[messageIndex] = errorMessage;

                return {
                     ...prevChats,
                    [chatId] : {
                          ...prevChats[chatId],
                       messages : updatedMessages,
                     }
              }
           });

      }finally{
       setIsLoading(false);
     }
  };

  const interactWithGemini = async (userMessageContent, image = null, fileContent = null) => {
      if (!currentChatId) {
          console.warn("No chat selected.");
          return;
      }

      setIsLoading(true);

      // Create the new user message, including image and file data if present
      const newUserMessage = {
          content: userMessageContent,
          timestamp: new Date().toLocaleTimeString(),
          isUser: true,
          image: image ? { data: image, prompt: userMessageContent } : null,  // Store image and prompt
          file: fileContent ? { content: fileContent, prompt: userMessageContent } : null, // Store file and prompt
      };

      setChats(prevChats => {
          const currentChatMessages = prevChats[currentChatId]?.messages || [];
          return {
              ...prevChats,
              [currentChatId]: {
                  ...prevChats[currentChatId],
                  messages: [...currentChatMessages, newUserMessage],
              },
          };
      });

      try {
          // Use preparePrompt, passing image and fileContent if available
          const { model, prompt } = preparePrompt(userMessageContent, image, fileContent);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          let botResponseText = response.text();

            // Normalize newlines in the response
            botResponseText = botResponseText.replace(/(\n\s*){2,}/g, '\n'); // Replaced with single newline
            botResponseText = botResponseText.replace(/(\n\s*\n)/g, '\n');   // Ensure consistent single newlines

          const botMessage = {
              content: botResponseText,
              timestamp: new Date().toLocaleTimeString(),
              isUser: false,
          };

          setChats(prevChats => ({
              ...prevChats,
              [currentChatId]: {
                  ...prevChats[currentChatId],
                  messages: [...prevChats[currentChatId].messages, botMessage]
              }
          }));
        speak(botResponseText, language); // Pass the current language to speak

          // --- Live Chat Logic ---
          if (liveChatEnabled) {
              // Wait a short delay to avoid overwhelming the API, then send the bot's response as the next prompt.
              setTimeout(() => {
                if(liveChatEnabled) { // Check again in case it's been turned off
                  interactWithGemini(botResponseText);
                }
              }, 2000); // 2-second delay (adjust as needed)
          }


      } catch (error) {
          console.error('Error:', error);
          let errorMessageContent = '';
        // Multi-language error messages
        if (language === 'vi') {
            if (error.message.includes("400")) {
                errorMessageContent = "Lỗi 400: Yêu cầu không hợp lệ. Đảm bảo API Key của bạn là chính xác và tin nhắn không quá dài hoặc có nội dung không phù hợp.";
            } else if (error.message.includes("429")) {
                errorMessageContent = "Lỗi 429: Giới hạn API. Bạn đã gửi quá nhiều tin nhắn trong một khoảng thời gian ngắn. Hãy thử lại sau.";
            } else if (error.message.includes("500")) {
                errorMessageContent = "Lỗi 500: Lỗi máy chủ nội bộ. Đội ngũ của Google đã được thông báo. Hãy thử lại sau.";
            } else {
                errorMessageContent = "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.";
            }
        } else if (language === 'ko') {
             if (error.message.includes("400")) {
                errorMessageContent = "오류 400: 잘못된 요청입니다. API 키가 올바른지, 메시지가 너무 길거나 부적절한 내용을 포함하고 있지 않은지 확인하세요.";
            } else if (error.message.includes("429")) {
                errorMessageContent = "오류 429: API 제한입니다. 짧은 시간에 너무 많은 메시지를 보냈습니다. 잠시 후 다시 시도하세요.";
            } else if (error.message.includes("500")) {
                errorMessageContent = "오류 500: 내부 서버 오류입니다. Google에 알림이 전송되었습니다. 나중에 다시 시도하세요.";
            } else {
                errorMessageContent = "죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.";
            }
        } else if (language === 'ja') {
            if (error.message.includes("400")) {
                errorMessageContent = "エラー400: 不正なリクエストです。APIキーが正しいこと、メッセージが長すぎたり不適切な内容を含んでいないことを確認してください。";
            } else if (error.message.includes("429")) {
                errorMessageContent = "エラー429: API制限です。短時間にメッセージを送信しすぎました。しばらくしてからもう一度お試しください。";
            } else if (error.message.includes("500")) {
                errorMessageContent = "エラー500: 内部サーバーエラーです。Googleに通知されました。後でもう一度お試しください。";
            } else {
                errorMessageContent = "申し訳ありません。エラーが発生しました。もう一度お試しください。";
            }
        } else { // Default to English
            if (error.message.includes("400")) {
                errorMessageContent = "Error 400: Bad Request. Make sure your API key is correct and the message isn't too long or contain inappropriate content.";
            } else if (error.message.includes("429")) {
                errorMessageContent = "Error 429: API limit, too many messages in short time. Please wait before retrying.";
            } else if (error.message.includes("500")) {
                errorMessageContent = "Error 500: Internal Server Error. Google has been notified. Please try again later.";
            } else {
                errorMessageContent = "Sorry, an error occurred. Please try again.";
            }
        }

          const errorMessage = {
              content: errorMessageContent,
              timestamp: new Date().toLocaleTimeString(),
              isUser: false,
              isError: true,
          };
          setChats(prevChats => ({
              ...prevChats,
              [currentChatId]: {
                  ...prevChats[currentChatId],
                  messages: [...prevChats[currentChatId].messages, errorMessage],
              }
          }));

      } finally {
          setIsLoading(false);
      }
  };
const handleSend = async (e) => {
      e?.preventDefault();
      const trimmedInput = inputMessage.trim();
       if (!trimmedInput && !uploadedImage && !uploadedFile || isLoading) return;  // Require *something* to send


    setInputMessage(''); // Clear the input *after* using its value

      if (trimmedInput.startsWith("/search")) {
        const searchTerm = trimmedInput.substring(7).trim();
        const searchResults = searchMessages(searchTerm, chats[currentChatId]?.messages || []);

            if(searchResults.length > 0){
                const searchResultMessages = searchResults.map(m => {
                  const userLabel = language === 'vi' ? 'Bạn' :
                                    language === 'ko' ? '귀하' :
                                    language === 'ja' ? 'あなた' : 'You';
                 return `${m.isUser ? userLabel : botName}: ${m.content}`;
                  }).join('\n');

                // Multi-language search results
                   const searchMessage = {
                       content: language === 'vi'
                            ? `Kết quả tìm kiếm cho "${searchTerm}":\n${searchResultMessages}`
                            : language === 'ko'
                            ? `"${searchTerm}"에 대한 검색 결과:\n${searchResultMessages}`
                            : language === 'ja'
                            ? `「${searchTerm}」の検索結果:\n${searchResultMessages}`
                            : `Search results for "${searchTerm}":\n${searchResultMessages}`,
                          timestamp: new Date().toLocaleTimeString(),
                          isUser: false,
                    }
                        setChats(prevChats => ({
                        ...prevChats,
                         [currentChatId] : {
                               ...prevChats[currentChatId],
                              messages: [...prevChats[currentChatId].messages, searchMessage]
                          }
                  }));

      } else {
            // Multi-language "no results" message
            const noResultMessage = {
               content: language === 'vi'
                 ? `Không tìm thấy kết quả nào cho "${searchTerm}"`
                 : language === 'ko'
                 ? `"${searchTerm}"에 대한 결과를 찾을 수 없습니다`
                 : language === 'ja'
                 ? `「${searchTerm}」の結果は見つかりませんでした`
                 : `No results found for "${searchTerm}"`,
              timestamp: new Date().toLocaleTimeString(),
            isUser: false,
         };
         setChats(prevChats => ({
                ...prevChats,
               [currentChatId]: {
                      ...prevChats[currentChatId],
                    messages: [...prevChats[currentChatId].messages, noResultMessage],
              }
              }));
       }
       return;
}
 playSound("/sounds/send.mp3");
    if (model === 'google') {
        // Now pass the uploadedImage and uploadedFile, which might be null.
        interactWithGemini(trimmedInput, uploadedImage, uploadedFile);
         setUploadedImage(null); // Clear image after sending
        setUploadedFile(null); //Clear file after sending
     }else{
          // Multi-language no API message
           const noApiMessage = {
              content: language === 'vi' ? "Chưa có API thay thế được tích hợp."
                      : language === 'ko' ? "대체 API가 아직 통합되지 않았습니다."
                      : language === 'ja' ? "代替APIはまだ統合されていません。"
                      : "No alternative API has been integrated yet.",
                timestamp: new Date().toLocaleTimeString(),
                 isUser: false,
                isError: true
              }
           setChats(prevChats => ({
                  ...prevChats,
                  [currentChatId]: {
                       ...prevChats[currentChatId],
                       messages: [...prevChats[currentChatId].messages, noApiMessage],
                  }
          }));
      }
};

  const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

      if (file.size > 4 * 1024 * 1024) {
        // Multi-language alert
        alert(language === 'vi' ? 'Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 4MB.'
              : language === 'ko' ? '파일 크기가 너무 큽니다. 4MB보다 작은 파일을 선택하세요.'
              : language === 'ja' ? 'ファイルサイズが大きすぎます。4MB未満のファイルを選択してください。'
              : 'File size is too large. Please select a file smaller than 4MB.');
         return;
       }
     const reader = new FileReader();
     reader.onload = (e) => {
         const imageData = e.target.result;
         setUploadedImage(imageData);  // Store the image data in state
      }
          reader.readAsDataURL(file);
      };

    const handleTextFileUpload = (event) => {
    const file = event.target.files[0];
       if(!file) return;

    // Multi-language file type check
      if(!['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
       'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(file.type)){
       alert(language === 'vi' ? "Chỉ chấp nhận tệp .txt, .docx, .xlsx, .pptx và .pdf"
            : language === 'ko' ? ".txt, .docx, .xlsx, .pptx 및 .pdf 파일만 허용됩니다"
            : language === 'ja' ? ".txt, .docx, .xlsx, .pptx および .pdf ファイルのみ許可されます"
            : "Only .txt , .docx, .xlsx, .pptx and .pdf files are allowed");
         return;
      }

    const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        setUploadedFile(fileContent); // Store file content
  };

 reader.readAsText(file);

  }

  const copyMessageToClipboard = (text) => {
      navigator.clipboard.writeText(text).then(() => {

      }).catch(err => {
           console.error("Failed to copy message: ", err);

       })
 };

  const deleteMessage = (chatId, messageIndex) => {
        setChats(prevChats => {
               const updatedMessages = [...prevChats[chatId].messages];
               updatedMessages.splice(messageIndex, 1);
            return {
                ...prevChats,
                  [chatId]: {
                       ...prevChats[chatId],
                    messages: updatedMessages,
                  }
          };
     })
 }

  const startEditMessage = (messageIndex, content) => {
      setEditingMessageId(messageIndex);
      setTempEditContent(content); //Keep save, use for regeneration prompt.
  };


  const cancelEditMessage = () => {
      setEditingMessageId(null);
      setTempEditContent("");  //Clear temp
  };

 const saveEditMessage = (chatId, messageIndex, newContent) => { //Accept content NOW!
  const trimmedContent = newContent.trim();
    if (!trimmedContent) {
       cancelEditMessage();  // Handle as before, click and dont nothing = cancel.
        return;
   }

      setChats(prevChats => { //Save the states like original, *dont need a value set*.
          const updatedMessages = [...prevChats[chatId].messages];
         updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], content: trimmedContent };
         return {
             ...prevChats,
            [chatId]: {
               ...prevChats[chatId],
                  messages: updatedMessages,
             }
        };
    });
   setEditingMessageId(null); //Clear BOTH state when user finish the edits
   setTempEditContent("");
     regenerateResponse(chatId, messageIndex + 1);
 };

  const clearCurrentChat = () => {
     if (currentChatId) {
          setChats(prevChats => ({
            ...prevChats,
             [currentChatId] : {
              ...prevChats[currentChatId],
                messages: []
             }

      }));
}
  };

   const handleSaveCustomInstructions = () => {
     if(!currentChatId) return;

    setCustomInstructions(prev => ({
        ...prev,
       [currentChatId] : inputMessage.trim(),
     }));
      setInputMessage("");

};

const handleClearCustomInstructions = () => {
 if (!currentChatId) return;
  setCustomInstructions(prev => ({
     ...prev,
       [currentChatId] : "",

 }));

   const updatedCustomInstructions = {...customInstructions};
   delete updatedCustomInstructions[currentChatId];
     Cookies.set("customInstructions", JSON.stringify(updatedCustomInstructions));
      setInputMessage("");
};
const renderMessageContent = (content) => {
    const components = {
          code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              return !inline && match ? (
                  <SyntaxHighlighter style={docco} language={match[1]} PreTag="div" children={String(children).replace(/\n$/, '')} {...props} />
              ) : (
                  <code className={className} {...props}>
                      {children}
                  </code>
              )
          }
      }
      return (
          <Markdown
              components={components}
              rehypePlugins={[rehypeRaw]}
              children={content}
          />
      );
  };

   const particles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      duration: 10 + Math.random() * 20,
  }));

  return (
      <>
          {!isOnline && (
              <OfflineOverlay>
                  <WifiOff size={48} />
                  <div>{language === 'vi' ? 'Không có kết nối mạng'
                        : language === 'ko' ? '인터넷 연결 없음'
                        : language === 'ja' ? 'インターネットに接続されていません'
                        : 'No Internet Connection'}</div>
              </OfflineOverlay>
          )}
          <AppContainer darkMode={darkMode} isOnline={isOnline}>
            <audio ref={audioRef} preload="auto"></audio>
               <BackgroundAnimation darkMode={darkMode} duration={20}>
                  {particles.map((particle) => (
                      <motion.div
                          key={particle.id}
                          className="particle"
                          style={{
                              left: `${Math.random() * 100}vw`,
                              top: `${Math.random() * 100}vh`,
                              width: `${Math.random() * 5 + 5}px`,
                              height: `${Math.random() * 5 + 5}px`,
                              animationDuration: `${particle.duration}s`,
                              animationDelay: `-${Math.random() * particle.duration}s`,
                          }}
                      />
                  ))}
              </BackgroundAnimation>


              <ChatListToolbar darkMode={darkMode} show={showChatList}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold' }}>{language === 'vi' ? 'Cuộc trò chuyện' : 'Chats'}</div>
                   <Button onClick={() => setShowChatList(false)}><X size={20} /></Button>
                </div>
             <Button onClick={createNewChat} style={{ width: '100%', padding: '0.5rem' }}><PlusCircle size={16} style={{ marginRight: '4px' }} />{language === 'vi' ? 'Tạo cuộc trò chuyện mới' : 'New Chat'}</Button>
                {/* Chat List Rendering - FIXED KEY PROP */}
              {Object.entries(chats).map(([chatId, chatData]) => (
                  <ChatListItem
                      key={chatId} // Use chatId as the key – it's unique!
                      darkMode={darkMode}
                      onClick={() => selectChat(chatId)}
                      className={currentChatId === chatId ? 'active' : ''}
                  >
                      <ChatTitle>
                          {editingChatId === chatId ? (
                              <input
                                  type="text"
                                  value={newChatTitle}
                                  onChange={(e) => setNewChatTitle(e.target.value)}
                                  onBlur={() => confirmRenameChat(chatId)}
                                  onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                          confirmRenameChat(chatId);
                                      } else if (e.key === "Escape") {
                                          cancelRenameChat();
                                      }
                                  }}
                                  autoFocus
                                  style={{ width: '80%' }}
                              />
                          ) : (
                              chatData.title
                          )}
                      </ChatTitle>
                      {editingChatId !== chatId && (
                          <>
                              <Button onClick={(e) => { e.stopPropagation(); startRenameChat(chatId); }}><Edit size={16} /></Button>
                              <Button onClick={(e) => { e.stopPropagation(); deleteChat(chatId); }}><Trash2 size={16} /></Button>
                          </>
                      )}
                  </ChatListItem>
              ))}
            </ChatListToolbar>
            <Header darkMode={darkMode}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Button onClick={() => setShowChatList                    (!showChatList)}>
                          <List size={20} />
                      </Button>
                      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{botName}</h1>
                       <span style={{
                          padding: '0.25rem 0.5rem',
                          background: darkMode ? '#2d2d2d' : '#e9ecef',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem'
                      }}>
                          AI Assistant
                      </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>

                  <Button onClick={() => setShowCustomSettings(true)}  title={languageOptions.find(lang=>lang.code === language).name === "VI" ? "Tùy chỉnh mô hình" : "Custom Model"} >
                      <Settings size={20}/>
                  </Button>
                      <Button onClick={() => setShowInfoModal(true)}>
                          <Info size={20} />
                      </Button>

                     <Button onClick={() => {
                          if (model === 'google') {
                            setModel('none');
                            setShowApiAlert(true);
                          } else {
                              setModel('google');
                            setShowApiAlert(false);
                          }
                      }}>
                      <Shuffle size={20} />
                       <span style={{ marginLeft: '4px' }}>{model === 'google' ? 'Gemini' : 'Other'}</span>
                      </Button>

                {/* Language Switcher - DROPDOWN */}
                <LanguageDropdownContainer>
                    <LanguageDropdownButton onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}>
                        <Globe size={20} />
                        <span style={{ marginLeft: '4px' }}>{getLanguageName(language)}</span>
                    </LanguageDropdownButton>
                    {showLanguageDropdown && (
                        <LanguageDropdownContent darkMode={darkMode}>
                            {languageOptions.map(lang => (
                                <button key={lang.code} onClick={() => setAppLanguage(lang.code)}>
                                    {lang.name}
                                </button>
                            ))}
                        </LanguageDropdownContent>
                    )}
                </LanguageDropdownContainer>
                      <Button onClick={() => setSoundEnabled(!soundEnabled)}>
                          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                      </Button>
                      <Button onClick={() => setDarkMode(!darkMode)}>
                          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                      </Button>
                      <Button onClick={clearCurrentChat}>
                          <Trash2 size={20} />
                      </Button>
                       {/* Live Chat Toggle Button */}
                       <Button
                          onClick={() => setLiveChatEnabled(!liveChatEnabled)}
                          title={language === 'vi' ? 'Bật/tắt trò chuyện trực tiếp' : 'Toggle Live Chat'}
                      >
                          <Radio size={20} color={liveChatEnabled ? 'green' : 'currentColor'} />
                      </Button>
                  </div>

              </Header>
              <ChatArea darkMode={darkMode}>
                {showApiAlert && (
                  // Multi-language API alert
                      <ApiAlert>
                        <AlertTriangle className="icon" size={20} />
                        {language === 'vi'
                          ? "Chưa có API thay thế được tích hợp."
                          : language === 'ko'
                          ? "대체 API가 아직 통합되지 않았습니다."
                          : language === 'ja'
                          ? "代替 API はまだ統合されていません。"
                          : "No alternative API has been integrated yet."}
                      </ApiAlert>
                    )}

                  {currentChatId && chats[currentChatId] ? chats[currentChatId].messages.map((message, index) => (
                      <Message
                         key={index}
                         isUser={message.isUser}
                        isError={message.isError}
                       darkMode={darkMode}
                        isEditing={editingMessageId === index}   /* Keep props is editing for conditional rendering. */
                       >
                        {message.image ? (
                             <div>
                                <img
                                     src={message.image.data}
                                       alt="Uploaded"
                                     style={{
                                            maxWidth: '100%',
                                              borderRadius: '0.5rem',
                                            marginBottom: '0.5rem'
                                             }}
                                    />
                                 <div>{message.image.prompt}</div>

                                  {message.content && <div>{renderMessageContent(message.content)}</div>}
                                       </div>
                                ) : message.file ? (
                                  <div>
                                      <p><strong>{language === "vi" ? "Nội dung tệp: " : "File Content: "}</strong>{message.file.prompt}</p>
                                   <p style={{whiteSpace: 'pre-line'}}>{message.file.content}</p>

                                    </div>

                                   ) :(
                                           editingMessageId === index && message.isUser ? (
                                            <div
                                               className="editable-content" // Wrap inline edit
                                               contentEditable // make element content can edit inline.
                                              suppressContentEditableWarning // Prevent React warning, when u use it!
                                            onBlur={(e) => saveEditMessage(currentChatId, index, e.target.innerText)}  // Use inner text NOW, handle for it, save.

                                               onKeyDown={(e) => {  //Use enter/ esc to save, not button!
                                                   if(e.key === 'Enter'){
                                                           e.preventDefault(); //preventDefault behavior for line break
                                                        saveEditMessage(currentChatId, index, e.target.innerText); // same
                                                    } else if (e.key === "Escape") {
                                                        cancelEditMessage();
                                                         e.target.innerText = tempEditContent; // Restore for states.

                                                    }
                                                  }}
                                                dangerouslySetInnerHTML={{__html: tempEditContent}} // Dangerously... with using *temp* and BLUR for update
                                                  />


                                                 ) : (
                                                 <>
                                                  {renderMessageContent(message.content)}

                                                       <div className='message-actions'>    {/* group delete and copy together, DONT USE WITH REGENERATE BUTTON */}

                                                      <Button title={language === 'vi' ? "Xóa tin nhắn" : "Delete Message"} onClick={() => deleteMessage(currentChatId, index)}><Trash size={16} />   /</Button>                                                        <Button  title={language === 'vi' ? "Sao chép tin nhắn" : "Copy Message"} onClick={() => copyMessageToClipboard(message.content)}><Copy size={16} /></Button>
                                                       </div>
                                                     {!message.isUser && !message.isError &&(
                                                          <Button style = {{position: 'absolute', top: '0', right: '0' }} disabled = {isLoading}  onClick={() => regenerateResponse(currentChatId, index)}
                                                       title = {language === 'vi' ? "Tạo lại phản hồi" : "Regenerate Response"}

                                                         >
                                                            <RotateCcw size = {16}/>
                                                       </Button>
                                                       )}
                                                            {message.isUser && (

                                                         <Button
                                                            style={{ position: 'absolute', top: '0', right: '0' }}
                                                             onClick={() => startEditMessage(index, message.content)}

                                                              >

                                                           <Edit size={16} />
                                                              </Button>

                                                           )}
                                                     </>

                                                     )

                                      )}


                           <div className='timestamp'>
                                 {message.timestamp}
                           </div>
                      </Message>
                  )) :  <div style={{ textAlign: 'center', marginTop: '2rem', opacity: 0.7 }}>{language === 'vi' ? 'Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!' : 'No messages yet. Start the conversation!'}</div>}

                  {isLoading && (
                      <Message darkMode={darkMode}>
                          <TypingIndicator className="typing-indicator">
                              <span className="typing-dot"></span>
                              <span className="typing-dot"></span>
                              <span className="typing-dot"></span>
                          </TypingIndicator>
                      </Message>
                  )}
                  <div ref={messagesEndRef} />
              </ChatArea>

              <InputArea onSubmit={handleSend} darkMode={darkMode}>
             <div style={{fontSize: '0.8rem', color: darkMode ? '#bbb' : '#777', textAlign: 'center', marginBottom: '0.5rem' }}>
                        {language === 'vi' ? 'Nhấn Ctrl + Enter để gửi tin nhắn' : 'Press Ctrl + Enter to send'}
                    </div>
                  <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>

                     <input
                          type="file"
                        ref = {textInputRef}
                        onChange = {handleTextFileUpload}
                          accept=".txt, .docx, .xlsx, .pptx, .pdf"
                           style = {{display: 'none'}}
                      />

                         <Button
                              type="button"
                            onClick={() => textInputRef.current.click()}
                              disabled={model !== 'google'}  
                          >
                              <FileText size={20}/>
                         </Button>

                      <input
                          type="file"
                          ref={imageInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          style={{ display: 'none' }}
                      />
                       <Button
                          type="button"
                          onClick={() => imageInputRef.current.click()}
                           disabled={model !== 'google'} 
                      >
                                                  <Image size={20} />
                      </Button>
                      <Input
                          value={inputMessage}                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={(e) => {
                             if(e.ctrlKey && e.key === 'Enter'){
                                   handleSend(e);
                                  }
                             }}

                         placeholder={language === 'vi' ? "Nhập tin nhắn hoặc gõ /search để tìm kiếm..."
                                     : language === 'ko' ? "메시지를 입력하거나 /search를 입력하여 검색하세요..."
                                     : language === 'ja' ? "メッセージを入力するか、/search と入力して検索してください..."
                                     : "Enter a message or type /search to search..."}
                         darkMode={darkMode}
                         disabled={!currentChatId}
                     />
                     <Button
                         type="submit"
                         disabled={isLoading || !currentChatId}
                     >
                         <Send size={20} />
                     </Button>
                       {/* Attachment Indicators */}
                       {(uploadedImage || uploadedFile) && (
                           <AttachmentIndicator darkMode={darkMode}>
                               {uploadedFile && (
                                   <>
                                       <File className="indicator-icon" size={16} />
                                       <span>{language === 'vi' ? 'Tệp' :
                                             language === 'ko' ? '파일' :
                                             language === 'ja' ? 'ファイル' : 'File'}</span>
                                       <CheckCircle size={16} color="green" />
                                   </>
                               )}
                               {uploadedImage && (
                                   <>
                                   <Image className="indicator-icon" size={16}/>
                                   <span>{language === "vi" ? "Ảnh"
                                         : language === 'ko' ? "이미지"
                                         : language === 'ja' ? "画像"
                                         : "Image"}</span>
                                    <CheckCircle size={16} color="green"/>
                                   </>

                               )}
                           </AttachmentIndicator>
                       )}
                 </div>
             </InputArea>

             <CustomSettingsDrawer darkMode = {darkMode} show={showCustomSettings}>

                <div style = {{display: "flex", justifyContent: "space-between", alignContent: 'center'}}>

                   <h3>{languageOptions.find(lang=>lang.code === language).name === "VI" ? "Tùy chỉnh hướng dẫn" : "Custom Intruction"}</h3>
                    <Button onClick = {() => {setShowCustomSettings(false);setInputMessage("")}}>
                         <X size={16} />
                   </Button>
                 </div>
                     <textarea
                         placeholder={language === 'vi' ? "Nhập hướng dẫn tùy chỉnh..."
                                     : language === 'ko' ? "사용자 지정 지침 입력..."
                                     : language === 'ja' ? "カスタム指示を入力..."
                                     : "Enter custom instructions..."}
                       value={inputMessage}
                          onChange = {(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                                if(e.key === 'Escape'){
                                    setShowCustomSettings(false);
                                    setInputMessage("");
                              }
                         }}
                      />

                        <div className="buttons">
                              <Button onClick={handleSaveCustomInstructions} disabled={!currentChatId}>{language === "vi" ? "Lưu" : "Save"}</Button>

                        <Button onClick={handleClearCustomInstructions} disabled = {!currentChatId}>

                            {language === "vi" ? "Xóa" : "Clear"}

                          </Button>
                     </div>

              </CustomSettingsDrawer>


             {showInfoModal && (
                <ModalOverlay onClick={() => setShowInfoModal(false)}>
                     <ModalContent darkMode={darkMode} onClick={(e) => e.stopPropagation()}>
                         <CloseButton onClick={() => setShowInfoModal(false)}>
                             <X size={16} />
                         </CloseButton>
                         <h2>{language === 'vi' ? 'Thông tin về VEGA'
                           : language === 'ko' ? 'VEGA 정보'
                           : language === 'ja' ? 'VEGAについて'
                           : 'About VEGA'}</h2>
                          <InfoSection darkMode = {darkMode}>     {/* Group information into sections */ }

                            <p>{language === 'vi' ? 'VEGA là một trợ lý AI được phát triển bởi Nam Trần, dựa trên mô hình ngôn ngữ Gemini Pro và Gemini Pro Vision của Google. Mục đích của VEGA là cung cấp thông tin, hỗ trợ và trò chuyện với người.'
                                : language === 'ko' ? 'VEGA는 Google의 Gemini Pro 및 Gemini Pro Vision 언어 모델을 기반으로 Nam Tran이 개발한 AI 어시스턴트입니다. VEGA의 목적은 사용자에게 정보, 지원 및 대화를 제공하는 것입니다.'
                                : language === 'ja' ? 'VEGA は、Google の Gemini Pro および Gemini Pro Vision 言語モデルに基づいて Nam Tran によって開発された AI アシスタントです。VEGA の目的は、ユーザーに情報、サポート、会話を提供することです。'
                                : 'VEGA is an AI assistant developed by Nam Tran, based on Google\'s Gemini Pro and Gemini Pro Vision language models.  VEGA\'s purpose is to provide information, support, and conversation with users.'}</p>

                               </InfoSection>
                             <InfoSection darkMode = {darkMode}>      {/* Key Features */ }

                          <h3>{language === 'vi' ? 'Tính năng chính:' : 'Key Features:'}</h3>
                          <ul>
                              <li>{language === 'vi' ? 'Trả lời câu hỏi bằng tiếng Việt và tiếng Anh'
                                  : language === 'ko' ? '한국어와 영어로 질문에 답변'
                                  : language === 'ja' ? 'ベトナム語と英語で質問に回答'
                                  : 'Answer questions in Vietnamese and English'}</li>
                              <li>{language === 'vi' ? 'Phân tích hình ảnh (sử dụng mô hình Gemini Pro Vision)'
                                  : language === 'ko' ? '이미지 분석(Gemini Pro Vision 모델 사용)'
                                  : language === 'ja' ? '画像分析（Gemini Pro Visionモデルを使用）'
                                  : 'Image analysis (using the Gemini Pro Vision model)'}</li>
                              <li>{language === 'vi' ? 'Tìm kiếm tin nhắn'
                                  : language === 'ko' ? '메시지 검색'
                                  : language === 'ja' ? 'メッセージ検索'
                                  : 'Message search'}</li>
                              <li>{language === 'vi' ? 'Hỗ trợ chuyển văn bản thành giọng nói (tiếng Việt và tiếng Anh)'
                                  : language === 'ko' ? '텍스트 음성 변환 지원(한국어 및 영어)'
                                  : language === 'ja' ? 'テキスト読み上げのサポート（ベトナム語と英語）'
                                  : 'Text-to-speech support (Vietnamese and English)'}</li>
                              <li>{language === 'vi' ? 'Chế độ tối/sáng'
                                  : language === 'ko' ? '다크/라이트 모드'
                                  : language === 'ja' ? 'ダーク/ライトモード'
                                  : 'Dark/light mode'}</li>
                              <li>{language === 'vi' ? 'Quản lý nhiều cuộc trò chuyện'
                                  : language === 'ko' ? '여러 대화 관리'
                                  : language === 'ja' ? '複数の会話を管理'
                                  : 'Manage multiple conversations'}</li>
                              <li>{language === 'vi' ? 'Chuyển đổi ngôn ngữ'
                                  : language === 'ko' ? '언어 전환'
                                  : language === 'ja' ? '言語切り替え'
                                  : 'Language switching'}</li>
                              <li>{language === 'vi' ? 'Đổi tên cuộc hội thoại'
                                : language === 'ko' ? '대화 이름 변경'
                                : language === 'ja' ? '会話の名前変更'
                                : 'Rename conversation'}</li>

                            <li>{language === "vi" ? 'Sao chép tin nhắn'
                                : language === 'ko' ? '메시지 복사'
                                : language === 'ja' ? 'メッセージをコピー'
                                : "Copy messages"}</li>

                            <li>{language === "vi" ? 'Xóa tin nhắn'
                                : language === 'ko' ? '메시지 삭제'
                                : language === 'ja' ? 'メッセージを削除'
                                : "Delete messages"}</li>

                          </ul>

                            </InfoSection>
                            <InfoSection darkMode = {darkMode}>    {/*Contact info and group to better, easier read.*/}

                               <ContactInfo darkMode={darkMode}>

                         <h3>{language === 'vi' ? 'Thông tin liên hệ:'
                           : language === 'ko' ? '연락처 정보:'
                           : language === 'ja' ? '連絡先情報:'
                           : 'Contact Information:'}</h3>
                            <div className="contact-item">
                                     <span className="contact-label">{language === 'vi' ? 'Email:' : 'Email:'}</span>
                                  <a href="mailto:Namtran5905@gmail.com" className="contact-link">Namtran5905@gmail.com</a>
                              </div>
                                 <div className="contact-item">
                                     <span className="contact-label">{language === 'vi' ? 'Website:' : 'Website:'}</span>
                                     <a href="https://namtran592005.github.io/BioPage/" target="_blank" rel="noopener noreferrer" className="contact-link">https://namtran592005.github.io/BioPage/</a>
                            </div>
                               </ContactInfo>
                         </InfoSection>
                           <footer>       {/*Use footer for contact/copyright info*/}
                             <p style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
                             © {new Date().getFullYear()} Trần Võ Hoàng Nam. All rights reserved.
                           </p>
                           </footer>
                     </ModalContent>
                 </ModalOverlay>
             )}
         </AppContainer>
     </>
 );
}

export default App;