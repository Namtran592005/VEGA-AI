import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Cookies from 'js-cookie';
import { Sun, Moon, Volume2, VolumeX, Send, Image, Trash2, Info, List, X, PlusCircle, Shuffle, Globe, AlertTriangle, Edit, RefreshCcw, FileText, Settings, Save, RotateCcw, Copy, Trash } from 'lucide-react'; // Add Copy icon
import styled, { keyframes } from 'styled-components';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { motion } from 'framer-motion';

// Google Gemini API Key (Replace with YOUR key)
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

// --- Styled Components ---
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
`;

const Header = styled.header`
  padding: 1rem;
  border-bottom: 1px solid ${props => props.darkMode ? '#333' : '#ddd'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: ${fadeIn} 0.5s ease;
  z-index: 100;
  background: ${props => props.darkMode ? 'rgba(45, 45, 45, 0.95)' : 'rgba(248, 249, 250, 0.95)'};
  backdrop-filter: blur(10px);
   @media (max-width: 768px) {
    padding: 0.5rem;
  }
`;
const ChatArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
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
    padding: 0.5rem;
  }
`;

const Message = styled.div`
   max-width: 85%;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background: ${props => props.isUser ? '#007bff' : props.darkMode ? '#333' : '#fff'};
  color: ${props => props.isUser ? '#fff' : props.darkMode ? '#fff' : '#212529'};
  padding: 1rem;
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
       opacity: ${props => (props.isEditing ? 0 : 1)}; /* Hide when editing */
        /* Avoid to disable onclick and z-index (can be interacted below in div), just only opacity! */

     }
  }
   /* Prevent hover if have an errors*/
     ${props => props.isError && `
     &:hover{
            transform: none;
             box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23); /* Normal value to avoid hover. */
        }

  `}

  ${props => !props.isUser && !props.isError && `
    border: 1px solid ${props.darkMode ? '#444' : '#eee'};
  `}

  ${props => props.isError && `
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  `}
   @media (max-width: 768px) {
    max-width: 95%;
     padding: 0.75rem;
    font-size: 0.9rem;
  }

  .message-actions {
       position: absolute;
       bottom: 0.4rem; /*Reduce spaces*/
      left: 50%;
     transform: translateX(-50%);  /* Position center */
       display: flex;
        gap: 0.5rem;
         opacity: 0;
         transition: opacity 0.2s ease;


    & > button {
      padding: 0.1rem 0.2rem;   /*Keep small, clickable area.*/
      background-color: transparent;  /* Remove backgrounds on the buttons themselves. */
      }
     }

    .timestamp{          /*Classname, handle show timestamp*/
        font-size: 0.55rem; /*Reduce little fontsize*/
        opacity: 0.7;     /*Reduce value */
       margin-bottom: 0.6rem;     /*Give time top to message content.*/
         margin-left: 0.5rem; /*Margin space between timestamp and bottom (with buttons group). */
       position: absolute;     /*ABSOLUTE postion and place at the left */
      bottom: 0;         /* stick the bottom */
      left: 0;        /* Keep stick in bottom right and margin with margin left!*/

    }
    .editable-content{          /* New Styles for Content, to handle edit message inline (important, DONT need input) */
      padding: 0.25rem;   /* ADD some PADDING!*/
        border: 1px dashed transparent;      /*border only displays and interacts, it can make message move. And click without make them error! */
        border-radius: 4px;       /* keep rounded shape. */
       cursor: text;        /* Shows that is editable for content */
     &:focus{              /* Use Focus to easier make. */
          outline: none;
          border-color: ${props => props.darkMode ? "#fff" : '#888'};  /*border show when editing inline! */

      }
    }
`;

//No changes input Area/.., copy pre-code
const InputArea = styled.form`
  padding: 1rem;
  border-top: 1px solid ${props => props.darkMode ? '#2d2d2d' : '#dee2e6'};
  z-index: 100;
    @media (max-width: 768px) {
        padding: 0.5rem;
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
        padding: 0.3rem; /* Reduce padding on smaller screens */
        margin: 0 0.1rem; /* Adjust margins */
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
  z-index: 1000;
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
  transition: left 0.3s ease;
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

function App() {
    const [darkMode, setDarkMode] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [language, setLanguage] = useState('vi'); // 'vi' or 'en'
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
     const [showApiAlert, setShowApiAlert] = useState(false); // State to control API Alert visibility
    const [showChatList, setShowChatList] = useState(false);
    const [model, setModel] = useState('google'); // 'google' or 'none' (for no API)

    const [chats, setChats] = useState({});
    const [currentChatId, setCurrentChatId] = useState(null);
     const [editingChatId, setEditingChatId] = useState(null);  // ID of chat being renamed
    const [newChatTitle, setNewChatTitle] = useState('');     // New title during rename
    const [editingMessageId, setEditingMessageId] = useState(null); // Track the edited Message
    const [tempEditContent, setTempEditContent] = useState("");
    const [customInstructions, setCustomInstructions] = useState({}); //Customs intructions for each chats
    const [showCustomSettings, setShowCustomSettings] = useState(false); //Control open/close of settings window

    const messagesEndRef = useRef(null);
     const audioRef = useRef(null);
    const imageInputRef = useRef(null);
    const textInputRef = useRef(null);

     const [showInfoModal, setShowInfoModal] = useState(false);
      const botName = "VEGA"; // Bot's name is fixed now
       const playSound = (soundFile) => {
         if (audioRef.current) {
        audioRef.current.src = soundFile;
        audioRef.current.play().catch(error => {
          console.warn("Audio play failed:", error);  // Warn instead of full error
          // Consider a fallback action, e.g., a subtle visual cue.
        });
        }
     };
    useEffect(() => {
        const savedChats = Cookies.get('chatHistory');
        if (savedChats) {
            try {
                const parsedChats = JSON.parse(savedChats);
                setChats(parsedChats);
                const chatIds = Object.keys(parsedChats);
                if (chatIds.length > 0) {
                    setCurrentChatId(chatIds[chatIds.length - 1]);
                }
            } catch (error) {
                console.error('Error loading chat history:', error);
            }
        }
        const savedModel = Cookies.get('selectedModel');
        setModel(savedModel || 'google');

        const savedLanguage = Cookies.get('selectedLanguage');
         setLanguage(savedLanguage || 'vi');

         const savedSoundEnabled = Cookies.get('soundEnabled');
          if (savedSoundEnabled !== undefined) {  // Important: Check for undefined
                setSoundEnabled(savedSoundEnabled === 'true');
          }

     const savedCustomInstructions = Cookies.get('customInstructions'); // Load custom instuctions
          if(savedCustomInstructions){
                try{
                    setCustomInstructions(JSON.parse(savedCustomInstructions));
                   }catch(error){
                     console.error("Error loading custom instruction", error); // Fix typos.
                }
           }

    }, []);

      useEffect(() => {
    if(Object.keys(chats).length > 0) { //save if any chat exists
        Cookies.set('chatHistory', JSON.stringify(chats), { expires: 7 });
    }
        Cookies.set('selectedModel', model);
        Cookies.set('selectedLanguage', language);
        Cookies.set('soundEnabled', soundEnabled);
        Cookies.set('customInstructions', JSON.stringify(customInstructions)); //save Custom Intruction when chats has been change

    }, [chats, model, language, soundEnabled, customInstructions]);



    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chats, currentChatId]);


   const speak = useCallback((text, lang = language) => {
    if (soundEnabled && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
        const voices = window.speechSynthesis.getVoices();
         if (voices.length > 0) {
          const preferredVoice = voices.find(voice => voice.lang === utterance.lang && voice.localService);
          utterance.voice = preferredVoice || voices[0];
      }

      window.speechSynthesis.speak(utterance);
    }
  }, [soundEnabled, language]);

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
    setShowChatList(false);
};


  const deleteChat = (chatId) => {
    setChats(prevChats => {
        const updatedChats = { ...prevChats };
        delete updatedChats[chatId];
        if (currentChatId === chatId) {
            const chatIds = Object.keys(updatedChats);
            setCurrentChatId(chatIds.length > 0 ? chatIds[0] : null);
        }
        return updatedChats;
    });

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

  const searchMessages = (searchTerm, chatMessages) => {
    if (!searchTerm) return [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    return chatMessages.filter(message =>
      message.content.toLowerCase().includes(lowerSearchTerm)
    );
  };

    const preparePrompt = (userMessageContent, image = null, isRegeneration = false) => {
        let modelToUse, prompt;
         const currentChat = chats[currentChatId];
         let previousMessages = [];

         if(currentChat && !isRegeneration){
            previousMessages = currentChat.messages.slice(0,-1).map(msg => ({
            role: msg.isUser ? 'user' : 'model',
            parts: msg.image
                       ? [msg.image.prompt, {
                            inlineData: {
                             data: msg.image.data.split(',')[1],
                             mimeType: msg.image.data.split(';')[0].split(':')[1],
                              }
                          }]
                          : (msg.file ? [msg.file.prompt,msg.file.content] : msg.content)
                    }));
            }else if(currentChat && isRegeneration){
             previousMessages = currentChat.messages.map(msg => ({
                role: msg.isUser ? "user" : 'model',
                 parts: msg.image
                       ? [msg.image.prompt, {
                            inlineData: {
                             data: msg.image.data.split(',')[1],
                             mimeType: msg.image.data.split(';')[0].split(':')[1],
                              }
                          }]
                       : (msg.file ? [msg.file.prompt, msg.file.content] : msg.content),

                }));

           }


        if (image) {
            modelToUse = googleGenAI.getGenerativeModel({ model: "gemini-pro-vision" });
            prompt = language === 'vi'
                ? ["Hãy mô tả chi tiết và chính xác nhất có thể. Đây là hình ảnh và câu hỏi, hãy trả lời chi tiết bằng tiếng việt:\n\n" + userMessageContent, { inlineData: { data: image.split(',')[1], mimeType: image.split(';')[0].split(':')[1] } }]
                : ["Describe it in as much detail and as accurately as possible. Here is an image and a query, respond in detail:\n\n" + userMessageContent, { inlineData: { data: image.split(',')[1], mimeType: image.split(';')[0].split(':')[1] } }];
        } else {
             modelToUse = googleGenAI.getGenerativeModel({ model: "gemini-pro" });
            const customPrompt = customInstructions[currentChatId] || "";

           if(language === 'vi'){
              prompt = `${customPrompt}\nBạn là ${botName}.  Đây là các tin nhắn trước:\n${JSON.stringify(previousMessages)}\nHãy trả lời tin nhắn cuối, một cách chi tiết và chính xác nhất có thể:\n\n${userMessageContent}`;
                }else{
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
        const { model, prompt } = preparePrompt(chats[chatId].messages[messageIndex-1].content , null ,true);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          let botResponseText = response.text();

        setChats(prevChats => {
            const updatedMessages = [...prevChats[chatId].messages];
            updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], content: botResponseText };

           return {
                ...prevChats,
              [chatId] : {
                   ...prevChats[chatId],
                 messages: updatedMessages
                }
         };

        });
        speak(botResponseText);

        }catch(error){
             console.error("Error regenerating response: ", error);
            let errorMessageContent = "";

            if (language === 'vi') {
                 if (error.message.includes("400")) {
                     errorMessageContent = "Lỗi 400: Yêu cầu không hợp lệ.  Đảm bảo API Key của bạn là chính xác và tin nhắn không quá dài hoặc có nội dung không phù hợp.";
                       } else if(error.message.includes("429")){
                       errorMessageContent = "Lỗi 429: Giới hạn API. Bạn đã gửi quá nhiều tin nhắn trong một khoảng thời gian ngắn. Hãy thử lại sau."
                    }
                     else if (error.message.includes("500")) {
                      errorMessageContent = "Lỗi 500: Lỗi máy chủ nội bộ.  Đội ngũ của Google đã được thông báo.  Hãy thử lại sau.";
                      } else {
                          errorMessageContent = "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.";
                         }
                   } else {
                         if (error.message.includes("400")) {
                              errorMessageContent = "Error 400: Bad Request. Make sure your API key is correct and the message isn't too long or contain inappropriate content.";
                         }
                            else if(error.message.includes("429")){
                                errorMessageContent = "Error 429: API limit, too many messages in short time. Please wait before retrying.";
                         }
                               else if (error.message.includes("500")) {
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

    const newUserMessage = {
      content: userMessageContent,
      timestamp: new Date().toLocaleTimeString(),
      isUser: true,
       image: image ? { data: image, prompt: userMessageContent } : null,
      file: fileContent ? {content: fileContent, prompt: userMessageContent} : null,
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
         const { model, prompt } = preparePrompt(userMessageContent, image, false);
            const result = await model.generateContent(prompt);
                const response = await result.response;
              let botResponseText = response.text();
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
      speak(botResponseText);
  } catch (error) {
      console.error('Error:', error);
    let errorMessageContent = '';
    if (language === 'vi') {
      if (error.message.includes("400")) {
        errorMessageContent = "Lỗi 400: Yêu cầu không hợp lệ.  Đảm bảo API Key của bạn là chính xác và tin nhắn không quá dài hoặc có nội dung không phù hợp.";
      } else if(error.message.includes("429")){
        errorMessageContent = "Lỗi 429: Giới hạn API. Bạn đã gửi quá nhiều tin nhắn trong một khoảng thời gian ngắn. Hãy thử lại sau."
       }
      else if (error.message.includes("500")) {
        errorMessageContent = "Lỗi 500: Lỗi máy chủ nội bộ.  Đội ngũ của Google đã được thông báo.  Hãy thử lại sau.";
      } else {
        errorMessageContent = "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.";
      }
    } else {
      if (error.message.includes("400")) {
        errorMessageContent = "Error 400: Bad Request. Make sure your API key is correct and the message isn't too long or contain inappropriate content.";
      }
       else if(error.message.includes("429")){
          errorMessageContent = "Error 429: API limit, too many messages in short time. Please wait before retrying.";
        }
      else if (error.message.includes("500")) {
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
         if (!trimmedInput || isLoading) return;

      setInputMessage('');

        if (trimmedInput.startsWith("/search")) {
          const searchTerm = trimmedInput.substring(7).trim();
          const searchResults = searchMessages(searchTerm, chats[currentChatId]?.messages || []);

              if(searchResults.length > 0){
                  const searchResultMessages = searchResults.map(m => {
                    const userLabel = language === 'vi' ? 'Bạn' : 'You';
                   return `${m.isUser ? userLabel : botName}: ${m.content}`;
                    }).join('\n');

                     const searchMessage = {
                         content: language === 'vi'
                              ? `Kết quả tìm kiếm cho "${searchTerm}":\n${searchResultMessages}`
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
              const noResultMessage = {
                 content: language === 'vi'
                   ? `Không tìm thấy kết quả nào cho "${searchTerm}"`
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
          interactWithGemini(trimmedInput);
       }else{
             const noApiMessage = {
                 content: language === 'vi' ? "Chưa có API thay thế được tích hợp." : "No alternative API has been integrated yet.",
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
            alert(language === 'vi' ? 'Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 4MB.' : 'File size is too large. Please select a file smaller than 4MB.');
           return;
         }
       const reader = new FileReader();
       reader.onload = (e) => {
              const imageData = e.target.result;
            if(model === 'google'){
                 interactWithGemini(inputMessage, imageData);
                 }
             setInputMessage('');
        }
            reader.readAsDataURL(file);
        };

      const handleTextFileUpload = (event) => {
      const file = event.target.files[0];
         if(!file) return;

        if(!['application/pdf', 'text/plain'].includes(file.type)){
         alert(language === 'vi' ? "Chỉ chấp nhận tệp .txt và .pdf" : "Only .txt and .pdf files are allowed");
           return;
        }

      const reader = new FileReader();
        reader.onload = (e) => {
          const fileContent = e.target.result;
           if(model === "google"){
                  interactWithGemini(inputMessage, null, fileContent);
               }
           setInputMessage("");

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


  const selectChat = (chatId) => {
    setCurrentChatId(chatId);
    setShowChatList(false);
      setEditingChatId(null);
      setNewChatTitle('');
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
        <AppContainer darkMode={darkMode}>
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
            {Object.entries(chats).map(([chatId, chatData]) => (
              <ChatListItem
                key={chatId}
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
                            if(e.key === "Enter"){
                                confirmRenameChat(chatId);
                            }else if (e.key === "Escape") {
                               cancelRenameChat();
                            }
                        }}
                        autoFocus
                        style = {{width: '80%'}}
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

                <Button onClick={() => setShowCustomSettings(true)}  title={language === "vi" ? "Tùy chỉnh mô hình" : "Custom Model"} >
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
                   <Button onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}>
                        <Globe size={20} />
                        <span style={{ marginLeft: '4px' }}>{language === 'vi' ? 'VI' : 'EN'}</span>
                    </Button>
                    <Button onClick={() => setSoundEnabled(!soundEnabled)}>
                        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </Button>
                    <Button onClick={() => setDarkMode(!darkMode)}>
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </Button>
                    <Button onClick={clearCurrentChat}>
                        <Trash2 size={20} />
                    </Button>
                </div>

            </Header>
            <ChatArea darkMode={darkMode}>
              {showApiAlert && (
                    <ApiAlert>
                      <AlertTriangle className="icon" size={20} />
                      {language === 'vi'
                        ? "Chưa có API thay thế được tích hợp."
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

                                                    <Button title={language === 'vi' ? "Xóa tin nhắn" : "Delete Message"} onClick={() => deleteMessage(currentChatId, index)}><Trash size={16} /></Button>
                                                         <Button  title={language === 'vi' ? "Sao chép tin nhắn" : "Copy Message"} onClick={() => copyMessageToClipboard(message.content)}><Copy size={16} /></Button>
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
                <div style={{ display: 'flex', gap: '0.5rem' }}>

                   <input
                        type="file"
                      ref = {textInputRef}
                      onChange = {handleTextFileUpload}
                        accept=".txt, .pdf"
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
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                         onKeyDown={(e) => {
                            if(e.ctrlKey && e.key === 'Enter'){
                                  handleSend(e);
                                 }
                            }}

                        placeholder={language === 'vi' ? "Nhập tin nhắn hoặc gõ /search để tìm kiếm..." : "Enter a message or type /search to search..."}
                        darkMode={darkMode}
                        disabled={!currentChatId}
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || !currentChatId}
                    >
                        <Send size={20} />
                    </Button>
                </div>
            </InputArea>

            <CustomSettingsDrawer darkMode = {darkMode} show={showCustomSettings}>

               <div style = {{display: "flex", justifyContent: "space-between", alignContent: 'center'}}>

                  <h3>{language === "vi" ? "Tùy chỉnh hướng dẫn" : "Custom Intruction"}</h3>
                   <Button onClick = {() => {setShowCustomSettings(false);setInputMessage("")}}>
                        <X size={16} />
                  </Button>
                </div>
                    <textarea
                        placeholder={language === 'vi' ? "Nhập hướng dẫn tùy chỉnh..." : "Enter custom instructions..."}
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
                        <h2>{language === 'vi' ? 'Thông tin về VEGA' : 'About VEGA'}</h2>
                         <InfoSection darkMode = {darkMode}>     {/* Group information into sections */ }

                          <p>{language === 'vi' ? 'VEGA là một trợ lý AI được phát triển bởi Nam Trần, dựa trên mô hình ngôn ngữ Gemini Pro và Gemini Pro Vision của Google. Mục đích của VEGA là cung cấp thông tin, hỗ trợ và trò chuyện với người.' : 'VEGA is an AI assistant developed by Nam Trần, based on Google\'s Gemini Pro and Gemini Pro Vision language models.  VEGA\'s purpose is to provide information, support, and conversation with users.'}</p>

                             </InfoSection>
                           <InfoSection darkMode = {darkMode}>      {/* Key Features */ }

                        <h3>{language === 'vi' ? 'Tính năng chính:' : 'Key Features:'}</h3>
                        <ul>
                            <li>{language === 'vi' ? 'Trả lời câu hỏi bằng tiếng Việt và tiếng Anh' : 'Answer questions in Vietnamese and English'}</li>
                            <li>{language === 'vi' ? 'Phân tích hình ảnh (sử dụng mô hình Gemini Pro Vision)' : 'Image analysis (using the Gemini Pro Vision model)'}</li>
                            <li>{language === 'vi' ? 'Tìm kiếm tin nhắn' : 'Message search'}</li>
                            <li>{language === 'vi' ? 'Hỗ trợ chuyển văn bản thành giọng nói (tiếng Việt và tiếng Anh)' : 'Text-to-speech support (Vietnamese and English)'}</li>
                            <li>{language === 'vi' ? 'Chế độ tối/sáng' : 'Dark/light mode'}</li>
                            <li>{language === 'vi' ? 'Quản lý nhiều cuộc trò chuyện' : 'Manage multiple conversations'}</li>
                            <li>{language === 'vi' ? 'Chuyển đổi ngôn ngữ' : 'Language switching'}</li>
                            <li>{language ==='vi' ? 'Đổi tên cuộc hội thoại' : 'Rename conversation'}</li>
                            <li>{language === "vi" ? 'Sao chép tin nhắn' : "Copy messages"}</li>
                             <li>{language === "vi" ? 'Xóa tin nhắn' : "Delete messages"}</li>

                        </ul>

                          </InfoSection>
                          <InfoSection darkMode = {darkMode}>    {/*Contact info and group to better, easier read.*/}

                             <ContactInfo darkMode={darkMode}>

                        <h3>{language === 'vi' ? 'Thông tin liên hệ:' : 'Contact Information:'}</h3>
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
    );
}

export default App;