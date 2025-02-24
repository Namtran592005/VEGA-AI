import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Cookies from 'js-cookie';
import { Sun, Moon, Volume2, VolumeX, Send, Image, Trash2, Info, List, X, PlusCircle, Shuffle, Globe, AlertTriangle, Edit, RefreshCcw, FileText, Settings, Save, RotateCcw, Copy, Trash } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { motion } from 'framer-motion';

const googleGenAI = new GoogleGenerativeAI("AIzaSyDhadJt9dZSF0k9bVfI_Dc18JUYgbpbN7U");

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

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
       opacity: 1;
     }
  }

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
    bottom: 0.4rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
    opacity: 0;
    transition: opacity 0.2s ease;

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
`;

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

const InfoSection = styled.section`
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  background-color: ${props => props.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
  h3 {
    margin-bottom: 0.75rem;
    font-size: 1.25rem;
    border-bottom: 2px solid ${props => props.darkMode ? '#555' : '#ddd'};
    padding-bottom: 0.25rem;
  }
  ul {
    list-style: disc;
    margin-left: 1.5rem;
    li {
      margin-bottom: 0.25rem;
    }
  }
`;

// EditMessageInput - Separate component!
const EditMessageInput = styled.input`
  flex: 1; /*  Take up all available space */
  padding: 0.5rem;
  border: 1px solid ${props => props.darkMode ? '#ddd' : '#aaa'};
  border-radius: 4px;
  margin-right: 0.5rem; /* Space between input and buttons */
  background-color: ${props => props.darkMode ? '#444' : '#fff'};
  color: inherit;
  font-size: inherit; /* Inherit size and font from surrounding text */

  &:focus {
    outline: none;
    border-color: #0066cc;
  }
`;


function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [language, setLanguage] = useState('vi');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiAlert, setShowApiAlert] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const [model, setModel] = useState('google');
  const [chats, setChats] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [newChatTitle, setNewChatTitle] = useState('');

  // ---- EDITING STATE ----
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageContent, setEditMessageContent] = useState(''); // Separate state for editing
  // ---- END EDITING STATE ----

  const [customInstructions, setCustomInstructions] = useState({});
  const [showCustomSettings, setShowCustomSettings] = useState(false);

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const imageInputRef = useRef(null);
  const textInputRef = useRef(null);

  const [showInfoModal, setShowInfoModal] = useState(false);
  const botName = "VEGA";


  const playSound = useCallback((soundFile) => { //added const
      if (audioRef.current) {
          audioRef.current.src = soundFile;
          audioRef.current.play().catch(err => console.warn("Audio play failed",err));
      }

  }, []);

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
        if (Object.keys(chats).length > 0) {
            Cookies.set('chatHistory', JSON.stringify(chats), { expires: 7 });
        }
        Cookies.set('selectedModel', model);
        Cookies.set('selectedLanguage', language);
         Cookies.set('soundEnabled', soundEnabled);
          Cookies.set('customInstructions', JSON.stringify(customInstructions));

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
             const preferredVoice = voices.find(voice => voice.lang === utterance.lang && voice.localService); //find *local service*
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

    const searchMessages = (searchTerm, chatMessages) => { //added function const
      if (!searchTerm) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();
      return chatMessages.filter(msg => msg.content.toLowerCase().includes(lowerSearchTerm));

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
           modelToUse = googleGenAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });
            prompt = language === 'vi'
                   ? ["Hãy mô tả chi tiết và chính xác nhất có thể. Đây là hình ảnh và câu hỏi, hãy trả lời chi tiết bằng tiếng việt:\n\n" + userMessageContent, { inlineData: { data: image.split(',')[1], mimeType: image.split(';')[0].split(':')[1] } }]
                  : ["Describe it in as much detail and as accurately as possible. Here is an image and a query, respond in detail:\n\n" + userMessageContent, { inlineData: { data: image.split(',')[1], mimeType: image.split(';')[0].split(':')[1] } }];
          } else {
               modelToUse = googleGenAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });
              const customPrompt = customInstructions[currentChatId] || "";

             if(language === 'vi'){
                prompt = `${customPrompt}\nBạn là ${botName}.  Đây là các tin nhắn trước:\n${JSON.stringify(previousMessages)}\nHãy trả lời tin nhắn cuối, một cách chi tiết và chính xác nhất có thể:\n\n${userMessageContent}`;
                  }else{
                    prompt = `${customPrompt}\nYou are ${botName}. These are the previous messages:\n${JSON.stringify(previousMessages)}\nRespond to the last message in a detailed and accurate as possible:\n\n${userMessageContent}`;
                 }
        }
          return { model: modelToUse, prompt };
      };


      const regenerateResponse = async (chatId, messageIndex) => { // added regenerate async and try/catch/finally block

          if (!chats[chatId] || messageIndex < 0 || messageIndex >= chats[chatId].messages.length) {
                console.warn("Invalid chat ID or message index for regeneration."); // log if index not available
              return; // exit early if data invalid.
          }

             setIsLoading(true); // Disable to make regenate response available and not spaming.

              // Prepare new prompt and regenerate
            try{
                  const { model, prompt } = preparePrompt(chats[chatId].messages[messageIndex-1].content, null, true);
                  const result = await model.generateContent(prompt);  //similar like GEMENI INTEGRATE.
                  const response = await result.response;
                let botResponseText = response.text();

                   setChats(prevChats => {   // Just *only update content and replace*.
                    const updatedMessages = [...prevChats[chatId].messages];
                    updatedMessages[messageIndex] = {...updatedMessages[messageIndex], content: botResponseText }; // only upate message BOT.

                      return{ //Return update message *AFTER EDIT*.
                          ...prevChats,
                          [chatId]: {
                             ...prevChats[chatId],
                              messages: updatedMessages, //set message updated to prev state.

                             }
                       }
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
                   updatedMessages[messageIndex] = errorMessage; //only update when regenerating had errors.

                    return {
                         ...prevChats,
                        [chatId] : {
                              ...prevChats[chatId],
                           messages : updatedMessages,
                         }
                  }
               });

            }finally{
           setIsLoading(false); //finally turn loading *OFF*
          }
  };


const interactWithGemini = async (userMessageContent, image = null, fileContent = null) => {
    if(!currentChatId) {
       console.warn("No chat select");
        return;
    }

    setIsLoading(true);

    const newUserMessage = {
       content: userMessageContent,
        timestamp: new Date().toLocaleTimeString(),
         isUser: true,
          image: image ? { data: image, prompt: userMessageContent} : null, //keep origin
       file: fileContent ? {content: fileContent, prompt: userMessageContent} : null,
   };

   setChats(prevChats => {
     const currentChatMessages = prevChats[currentChatId]?.messages || [];
        return {
       ...prevChats,
           [currentChatId] : {
              ...prevChats[currentChatId],
                messages: [...currentChatMessages, newUserMessage],
           },

      };

    });


  try {

    const { model, prompt } = preparePrompt(userMessageContent, image, false); //get prompt from function and send prompt/model to gemini
        const result = await model.generateContent(prompt);
          const response = await result.response;
         let botResponseText = response.text();
       const botMessage = {
            content: botResponseText,
             timestamp: new Date().toLocaleTimeString(),
             isUser: false,

      };

          setChats(prevChats => ({  //Handle when API give value sucessfully.
              ...prevChats,   //Keep prev state
             [currentChatId]: {  //only update at the specify ID, dont change others!
                ...prevChats[currentChatId], //Keep children state before change it!
                  messages: [...prevChats[currentChatId].messages, botMessage] // then we just update at new message from bot
              }
            }
       ));

      speak(botResponseText); //speak when success and not error, settext... in here

    }catch(error){ //Handle Gemini errors
       console.error("Error: ", error);

      let errorMessageContent = "";
       if (language === 'vi') {
            if (error.message.includes("400")) {
              errorMessageContent = "Lỗi 400: Yêu cầu không hợp lệ. Đảm bảo API Key của bạn là chính xác và tin nhắn không quá dài hoặc có nội dung không phù hợp.";
            } else if (error.message.includes("429")) {
              errorMessageContent = "Lỗi 429: Giới hạn API. Bạn đã gửi quá nhiều tin nhắn trong một khoảng thời gian ngắn. Hãy thử lại sau.";
            } else if (error.message.includes("500")) {
              errorMessageContent = "Lỗi 500: Lỗi máy chủ nội bộ.  Đội ngũ của Google đã được thông báo.  Hãy thử lại sau.";
            } else {
              errorMessageContent = "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.";
            }
          } else {
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
          const errorMessage = { // Display Error message for users and keep friendly messages!.
            content: errorMessageContent,
            timestamp: new Date().toLocaleTimeString(),
            isUser: false,
            isError: true, // important, we use it to give styles (in <Message> component)

          };
      setChats(prevChats => ({
          ...prevChats,
        [currentChatId]: {
           ...prevChats[currentChatId],
            messages: [...prevChats[currentChatId].messages, errorMessage]
            }
        }));
      }finally {
      setIsLoading(false);  // *Always turn of loading, event have an error or finish*
      }
    };


    const handleSend = async (e) => { //added function const, change send message.
      e?.preventDefault();
        const trimmedInput = inputMessage.trim(); // get the value user and check empty or not
         if (!trimmedInput || isLoading) {  //Dont do anything if dont have current value in it.
            return;
       }
         setInputMessage('');

        if (trimmedInput.startsWith("/search")) {   //Search messages handle
        const searchTerm = trimmedInput.substring(7).trim(); // search the message from "/" after.
        const searchResults = searchMessages(searchTerm, chats[currentChatId]?.messages || []);

              if(searchResults.length > 0){  //check to display if not found any search
                  const searchResultMessages = searchResults.map(m => { // map and format display to show user what them search, value after search messages
                    const userLabel = language === 'vi' ? 'Bạn' : 'You'; // set label for easy manager and display what you want in
                   return `${m.isUser ? userLabel : botName}: ${m.content}`; //turn all result messages to  string.
                    }).join('\n'); // avoid object.

                     const searchMessage = { // and set search
                         content: language === 'vi'
                              ? `Kết quả tìm kiếm cho "${searchTerm}":\n${searchResultMessages}`
                                : `Search results for "${searchTerm}":\n${searchResultMessages}`,  // messages result search for
                            timestamp: new Date().toLocaleTimeString(),  // set and custom time for each messages
                            isUser: false,      //ofc, is not user! because that show by searching...
                      }
                          setChats(prevChats => ({    //and update state to show for it
                          ...prevChats,         // Keep state, important.
                           [currentChatId] : {     // set search for search content in a specific chatroom and in message
                                 ...prevChats[currentChatId],
                                messages: [...prevChats[currentChatId].messages, searchMessage]  // display, add search mess to messages
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
                  ...prevChats, // dont forget keep previous states
                 [currentChatId]: {
                        ...prevChats[currentChatId],  // current id
                      messages: [...prevChats[currentChatId].messages, noResultMessage],
                }
                }));
         }
         return;
  }
      playSound("/sounds/send.mp3");
      if (model === 'google') {  //keep condition origin.
          interactWithGemini(trimmedInput);
       }else{
             const noApiMessage = {
                 content: language === 'vi' ? "Chưa có API thay thế được tích hợp." : "No alternative API has been integrated yet.",
                  timestamp: new Date().toLocaleTimeString(),
                   isUser: false,
                  isError: true
                }
              setChats(prevChats => ({
                    ...prevChats, // Keep state and dont update other value.
                    [currentChatId]: {
                         ...prevChats[currentChatId], // specific message
                         messages: [...prevChats[currentChatId].messages, noApiMessage],
                    }
            }));
        }
};


   const handleImageUpload = (event) => { // image, set images
          const file = event.target.files[0];  // Get the image when user clicks
          if (!file) return; // if user dont choose anything, just stop it

        if (file.size > 4 * 1024 * 1024) { // Alert when that bigger 4mb limited
            alert(language === 'vi' ? 'Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 4MB.' : 'File size is too large. Please select a file smaller than 4MB.');
           return; // dont do anyting, when files to large!
         }
       const reader = new FileReader(); // if file image not bigger, handle for user to upload.
       reader.onload = (e) => {      //load images
              const imageData = e.target.result;  //get value image, user choose.
            if(model === 'google'){  // when user choose gemini pro model, image ananlytics just only using in gemini.
                 interactWithGemini(inputMessage, imageData);  // And pass both image and text, dont pass file null
                 }
             setInputMessage(''); //set messages to new.
        }
            reader.readAsDataURL(file); // keep the value image as file.
        };

     const handleTextFileUpload = (event) => {    // similar to image upload
      const file = event.target.files[0];    // Check upload.
         if(!file) return; // if no file, return

        if(!['application/pdf', 'text/plain'].includes(file.type)){  // Check, limit type can read to file content, user-friendly
         alert(language === 'vi' ? "Chỉ chấp nhận tệp .txt và .pdf" : "Only .txt and .pdf files are allowed");
           return;
         }

      const reader = new FileReader();   // IF can load that, set value to it.
        reader.onload = (e) => {          //similar, reader onload get *value*
          const fileContent = e.target.result;  // Keep file content to make an text and send, dont need origin text messages, because context need file.
           if(model === "google"){ // like IMAGE
                  interactWithGemini(inputMessage, null, fileContent);  //  Just PASS FILE content.
               }
           setInputMessage("");  // set input file, make them better ui/ux (clear messages after use click and files...)

    };

   reader.readAsText(file); //read the FILE AS TEXT! (not data url)
   //reader as URL: when u load, that include src/url image.... And make a DATA! (it use for display IMAGE).

}
    const copyMessageToClipboard = (text) => {
      navigator.clipboard.writeText(text)
      .then(() => {
        // Optional: Show a success message/notification
      })
      .catch(err => {
        console.error("Failed to copy message: ", err);
        // Optional: Show an error message
      });
    };

  const deleteMessage = (chatId, messageIndex) => { //Delete the message, get both message index, and chatid
    setChats(prevChats => {
      const updatedMessages = [...prevChats[chatId].messages]; // Get specify with mess in the id's messages, ...
       updatedMessages.splice(messageIndex, 1); //delete specify message!

        return { //return prev, dont need children ...currentchat, becuase only update it!
        ...prevChats, //keep children props.
          [chatId] : { // Update messages has already, and update it!
           ...prevChats[chatId],
              messages: updatedMessages,  // and *update new set value state*
           }
     };

   })
 }


  // ---- EDIT MESSAGE HANDLERS ----
  const startEditMessage = (index, content) => {
    setEditingMessageId(index);
    setEditMessageContent(content);
     setInputMessage(content); // Pass original for easy to change input and dont have to keep tracking states!

};

 const cancelEditMessage = () => {
    setEditingMessageId(null);   //RESET ID after edited
     setEditMessageContent("");  //and CONTENT for editedMessage!.
      setInputMessage("");      //Set back to send new message

};

   const saveEditMessage = (chatId, messageIndex) => {

      const trimmedContent = inputMessage.trim(); // trim user clicks in space, empty message.
       if(!trimmedContent) {  // Handle
          cancelEditMessage();  //just like previous comment.
            return;
        }
    setChats(prevChats => {     // keep set
       const updatedMessages = [...prevChats[chatId].messages];
        updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], content: trimmedContent }; // update for content user messages!

       return {        // set message has edited
            ...prevChats,
           [chatId]: {
              ...prevChats[chatId], //just use previous, because that faster to edit (replace 1, messages)
                 messages: updatedMessages
           }
      };

    });

       setEditingMessageId(null);  // Clear.
       setEditMessageContent("");  // Reset content edit
      setInputMessage("");         // Reset the original message input value!
    regenerateResponse(chatId, messageIndex + 1);

   }

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


    const selectChat = (chatId) => { //add funtion const
       setCurrentChatId(chatId);
      setShowChatList(false);        // Hide to better UX
      setEditingChatId(null);   // Set status origin, like new open site
       setNewChatTitle('');    //reset new title
   };

     const handleSaveCustomInstructions = () => {
       if(!currentChatId) return; // current Id

      setCustomInstructions(prev => ({ // prev = customIntructions
          ...prev,  //get origin value and use new object in it.
         [currentChatId] : inputMessage.trim(), // set by current chat Id
       })); //save custom to specifical messagesId, with value is trim user content!
        setInputMessage(""); // then, turn value in textbox value to origin to users retype
 };

  const handleClearCustomInstructions = () => {   // clear value instructions by what messages want!
   if (!currentChatId) return; // return to keep the message dont have value on it! (message null)
    setCustomInstructions(prev => ({        // previousInstructions, just set state like set chats/set mesage...
       ...prev,                          // previous
         [currentChatId] : "",       // with that Id, messages instructions content = "" -> clear to content!

   }));
    const updatedCustomInstructions = {...customInstructions}; // *keep for update*, update value like handle
    //if not clear to update new value, data keep same to like handle with send (search, message...
    // we use it for UPDATE not handle. If you handle origin with that method
     delete updatedCustomInstructions[currentChatId];    // DELETE KEY, when use press "Clear button"
       Cookies.set("customInstructions", JSON.stringify(updatedCustomInstructions)); // after reset, clear that value and
        setInputMessage(""); //
    };

  const renderMessageContent = (content) => { //Handle Message.
    const components = {
          code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              return !inline && match ? (        // render for high light when you chat ```
                  <SyntaxHighlighter style={docco} language={match[1]} PreTag="div" children={String(children).replace(/\n$/, '')} {...props} />
              ) : (                                 // display an high line syntax
                  <code className={className} {...props}>
                      {children}
                  </code>
              )
          }
      }
      return (          //render for the content display in your message!
          <Markdown    // when u send message like h1, markdown ...
              components={components}      // you just only read value (string, object... you just to set to component handle with markdown and markdown components display it!
              rehypePlugins={[rehypeRaw]} // plugin and add
              children={content}  //keep all text values u type like markdown in all message (handle it), and
          />
      );
  };



const particles = Array.from({ length: 50 }).map((_, i) => ({ // Keep like you have set up value, add keys for animation each object to keyframe display...
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
              {Object.entries(chats).map(([chatId, chatData]) => (  //Keep key id, avoid warning. And KEEP map/entries... to use values in easier.
                <ChatListItem
                     key={chatId}   //KEY and ID it is nessecary.
                     darkMode={darkMode}
                      onClick={() => selectChat(chatId)} // Select the Specify Id
                      className={currentChatId === chatId ? 'active' : ''}
                >

      <ChatTitle>
                    {editingChatId === chatId ? (  //check rename messages chat
                      <input
                        type="text"  // if click and want rename chat -> open to user set a new values!
                        value={newChatTitle}  // Keep props values (in lines 966 - keep)
                        onChange={(e) => setNewChatTitle(e.target.value)} // set
                        onBlur={() => confirmRenameChat(chatId)}
                        onKeyDown={(e) => { // Keydown and Key up use for enter, and other value!
                            if(e.key === "Enter"){ // easier, save if user dont have save on it.
                                confirmRenameChat(chatId); // and that will
                            }else if (e.key === "Escape") { // reset value when user dont want rename it.
                               cancelRenameChat(); // same like sendmessage!
                            }
                        }}
                        autoFocus  // if you edit rename, set
                        style = {{width: '80%'}} // size input rename like origin props
                    />
                    ) : (    // Display name message!
                      chatData.title
                  )}

                </ChatTitle>
                {editingChatId !== chatId && (    // Dont use value when editing to rename!
                    <>      {/* and use this with group rename! (if you can) */}
                      <Button onClick={(e) => { e.stopPropagation(); startRenameChat(chatId); }}><Edit size={16} /></Button> {/*button renam, get and pass chat Id.  */}
                        <Button onClick={(e) => { e.stopPropagation(); deleteChat(chatId); }}><Trash2 size={16} /></Button> {/*button, and *PASS* it to functions */}

                  </>
                 )}


               </ChatListItem>
            ))}
          </ChatListToolbar>

           <Header darkMode={darkMode}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Button onClick={() => setShowChatList(!showChatList)}><List size={20} /></Button>
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
                   {/* Custom Setting Buttons, display like other value (it can move above/below other component to display (Custom...) */}

             <Button onClick={() => setShowCustomSettings(true)} title={language === 'vi' ? "Tùy chỉnh" : "Settings"}><Settings size={20}/></Button>
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
                 {showApiAlert && (  // check and show, value. Keep that when integrate or dont have messages!
                  <ApiAlert>
                      <AlertTriangle className="icon" size={20} />
                    {language === 'vi'
                      ? "Chưa có API thay thế được tích hợp."
                      : "No alternative API has been integrated yet."}
                 </ApiAlert>
               )}

                 {currentChatId && chats[currentChatId] ? (   // *Render display messages if you have created to chats (or set it!), KEEP render, add map ... *
                     chats[currentChatId].messages.map((message, index) => (
                       <Message  // props origin
                           key={index} // messages is have value to messages: [{message:..}, {message:..}] -> so the content value is object -> add key index to object *{}* for not warning, and
                            isUser={message.isUser}  // pass props user! to show left/right -> origin
                            isError={message.isError} // pass error, to give error message style when users interact bad.
                         darkMode={darkMode}   // keep theme it

>
                          {message.image ? ( // IF USER MESSAGE UPLOAD IS *IMAGE*, show <img ... >. if you show text message, it can show *PATH IMAGE ONLY*, no value (display it)
                               <div>
                                    <img
                                         src={message.image.data}   // VALUE with image
                                          alt="Uploaded"
                                        style={{maxWidth: '100%',borderRadius: '0.5rem', marginBottom: '0.5rem'  }}
                                     />
                                   <div>{message.image.prompt}</div> {/* User prompt (what image upload using and do anything for it.) */}
                                     {message.content && <div>{renderMessageContent(message.content)}</div>} {/*bot message. */}
                            </div>
                           ) : message.file ? (
                             <div>
                                <p><strong>{language === "vi" ? "Nội dung tệp: " : "File Content: "}</strong>{message.file.prompt}</p> {/* what that file  content is using */}
                                    <p style={{whiteSpace: 'pre-line'}}>{message.file.content}</p>  {/*Show an value from gemini give respond! */}

                                    </div>

                             ):(    // DONT CHANGE AND KEEP LIKE ORIGIN, BECAUSE IT KEEP PERFORMANCE, *EDIT INLINE HAS AN MANY BUGS FOR THAT*.
                              <>  {/* handle to use fragment! */}
                              {renderMessageContent(message.content)}     {/* Display content you have save on state chats  */}
                                        {/* Actions group with 2 button for better, clean group*/}
                                   <div className='message-actions'>       {/* Grop actions */}
                                    {/* Use event message handle for each specify messages index/ current ChatId for u to copy,...*/}
                                     <Button title={language === 'vi' ? "Xóa tin nhắn" : "Delete Message"} onClick={() => deleteMessage(currentChatId, index)}><Trash size={16} /></Button>   {/* Keep inline function, no use  useCallBack! */}
                                   <Button  title={language === 'vi' ? "Sao chép tin nhắn" : "Copy Message"} onClick={() => copyMessageToClipboard(message.content)}><Copy size={16} /></Button>
                             </div>

                           {!message.isUser && !message.isError && (
                             <Button //Keep the position it! -> style above (not nessecary now)
                           style={{ position: 'absolute', top: '0', right: '0' }}
                        disabled={isLoading}
                      onClick={() => regenerateResponse(currentChatId, index)} // Dont need to *previous message*, BOT to need chat Id and  index + 1
                           title={language === 'vi' ? "Tạo lại" : "Regenerate"}
                           >

                    <RotateCcw size={16} />  {/* Use to set a new icons better u can changes for it */}
                 </Button>

               )}

                {message.isUser && (      //IF USER UPLOADED AND SHOW IN MESSAGE -> give user button edited!
                   <div style={{ position: 'absolute', top: '0', right: '0' }}>  {/*Edit message */}
                  {editingMessageId === index ? (
                      <>    {/*handle a group edit button */}
                      <Button onClick={() => saveEditMessage(currentChatId, index)} title={language=== "vi" ? "Lưu" : "Save"}><Save size={16} /></Button>    {/* Keep lines origin and only display*/}
                    <Button onClick={cancelEditMessage} title={language === 'vi' ? "Hủy" : "Cancel"}><X size={16} /></Button>      {/* Button group click! */}
                      </>
                       ) : (   // handle value when u edit, and turn previous value on state for check edit in each difference value to use!

                     <Button    /*When you start to edit */
                 onClick={() => startEditMessage(index, message.content)} // *START EDIT and turn and make and event, just only value on it...*

                 title={language === "vi" ? "Sửa tin nhắn" : "Edit Message"}> {/*Keep message.content on line 970.*/}
             <Edit size={16} />
          </Button>
        )}
       </div>
      )}
     </>
    )}

    <div className='timestamp'>{message.timestamp}</div>   {/*And format like line 512 */}
      </Message> // Keep messages group origin for
                  ))
                      ) :  <div style={{ textAlign: 'center', marginTop: '2rem', opacity: 0.7 }}>{language === 'vi' ? 'Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!' : 'No messages yet. Start the conversation!'}</div>}

                   {isLoading && (       // Check
                     <Message darkMode={darkMode}>  {/* Set a new group message for */}
                       <TypingIndicator className="typing-indicator">     {/* Check animation on it! */}
                        <span className="typing-dot"></span>{/* Use ... for typing when u load message! */}
                          <span className="typing-dot"></span>
                         <span className="typing-dot"></span>
                     </TypingIndicator>
                      </Message>
                   )}
                <div ref={messagesEndRef} />    {/*And div new message it create after when u load done! */}
              </ChatArea>

             {/*Handle Input text areas to users type, */}
                  <InputArea onSubmit={handleSend} darkMode={darkMode}>
                    <div style={{fontSize: '0.8rem', color: darkMode ? '#bbb' : '#777', textAlign: 'center', marginBottom: '0.5rem' }}>
                      {language === 'vi' ? 'Nhấn Ctrl + Enter để gửi tin nhắn' : 'Press Ctrl + Enter to send'}  {/* Text messages send notification  */}
                        </div>
                         <div style={{ display: 'flex', gap: '0.5rem' }}> {/* DIsplay for group items! (flex -> origin). */}
                    <input          //dont change that, just copy like! because
                      type="file"        // check handle send file if text have set to type, similar an image uploads
                     ref = {textInputRef}      //value for easier!
                    onChange = {handleTextFileUpload}      // upload
                     accept=".txt, .pdf"    // get all images values you
                   style = {{display: 'none'}}
               />

          <Button
               type="button"              //handle, do same thing for ... lines origin.
               onClick={() => textInputRef.current.click()}       //just check when you
               disabled={model !== 'google'}                      // do somethings, do same thing, lines origin in the pass code is goodest value (copy pre-code to)
          >      {/*  Disable -> limit model is *not google* */}
               <FileText size={20}/>        {/* icon text like image upload. */}
       </Button>

       <input        // Upload *Image*, copy and do like *file* uploader
         type="file"   // just get files *image* to file type, and pass onChange when users send it!
        ref={imageInputRef}
      onChange={handleImageUpload}  // Use ref. and. curent for ref. and handle user action for file (click,..)
      accept="image/*"    // handle just use when upload an image to use. (easier manager)
      style={{ display: 'none' }}    //hide origin.

    />

 <Button // upload Image, similar *TEXT FILE UPLOAD* above!
     type="button"   // do something check. like
   onClick={() => imageInputRef.current.click()}   // do like previous upload!
    disabled={model !== 'google'}      // And when use dont need image upload
    >

    <Image size={20} />      {/*display, make it clickable.*/}
  </Button>   {/*Handle if *EDITMESSAGEINPUT === TRUE*, display edit content for it to. And do thing... like!  */}
     {editingMessageId !== null ? (       // *EditMessageID*, Handle *IF !== NULL* it is show values content (u click and value display on it).
      <div style={{display: "flex", gap: '0.5rem', alignItems: 'center', width: "100%"}}>      {/* Display handle  group  easier interact * */}

      <EditMessageInput
      type="text" // it make your code cleaner.
     value={inputMessage}          // pass to *NEW* -> display new origin input value for use.
     darkMode={darkMode}     // easier! display your text. and type and keep do line. if value turn, -> return;
      onChange={(e) => setInputMessage(e.target.value)}    // and onChange! for keep typing.... like normal value you chat in before
    onKeyDown={(e) => {      // key down when your keyboard do a thing!
        if (e.key === 'Enter') {        // Keep save your when editing content!
            e.preventDefault();        // Save Message handle
              saveEditMessage(currentChatId, editingMessageId);    // SAVE ID
                   } else if (e.key === 'Escape') {          // IF want reset input -> Esc! to fast clear to u!.
                     cancelEditMessage();          //  reset values for it!
                  }
             }}
     />
          </div>
            ):(   // If user type or do to make set value from keyboard
             <Input // origin. Dont changes. It can make error.
                value={inputMessage}
                 onChange={(e) => setInputMessage(e.target.value)} // and when you press on
                   onKeyDown={(e) => {                // if Ctrl + Key. it fast to use send value/ *Keep it*
                  if(e.ctrlKey && e.key === 'Enter'){  //check condition! and check! what
                        handleSend(e);   // then prevent that make u key press and then move to *other to value content for key.* -> fix
                   }
        }}

            placeholder={language === 'vi' ? "Nhập tin nhắn hoặc gõ /search để tìm kiếm..." : "Enter a message or type /search to search..."} //place holder
               darkMode={darkMode}  //dark
                 disabled={!currentChatId}     //If no have to a current id to it (can show alert on it!),
                 />
                     )}      {/* Dont forget, -> when editing === false (dont use edit messages content!) , we can use button send!  */}
                  <Button        /* Submit message,...origin! */
                   type="submit"           /* use this lines origin for better!.*/
                      disabled={isLoading || !currentChatId}
                    >
                   <Send size={20} />  {/* Keep value like use in normal cases when u send message,... */}
              </Button>
             </div>
             </InputArea>
                {/* Handle window settings for custom! */ }
                     <CustomSettingsDrawer darkMode = {darkMode} show={showCustomSettings}>  {/*Check open/close set set state,... to show window */}

                        <div style = {{display: "flex", justifyContent: "space-between", alignContent: 'center'}}>    {/* display handle header (like other componet.) */}

                           <h3>{language === "vi" ? "Tùy chỉnh hướng dẫn" : "Custom Intruction"}</h3>       {/* Custom Title */}
                            <Button onClick = {() => {setShowCustomSettings(false);setInputMessage("")}}>      {/* Reset State of */}
                             <X size={16} />      {/* handle faster use, origin and pass*/}
                         </Button>            {/*  Handle it with faster using custom window and dont keep more times to close it! (like keyboard..) */ }
                            </div>
                         <textarea // Handle Intructions type from user and
                        value={inputMessage}        // value
                          onChange = {(e) => setInputMessage(e.target.value)} // and type message what user what... (or keep default empty,.)
                        onKeyDown={(e) => {          // and use
                               if(e.key === 'Escape'){        //  Like key down
                                  setShowCustomSettings(false);       // set new,
                                 setInputMessage("");      // turn set to a new input message
                             }
                          }}
                               placeholder={language === 'vi' ? "Nhập hướng dẫn tùy chỉnh..." : "Enter custom instructions..."}      // when your work is done... u just to need. and what that u do and what

                         />

                           <div className="buttons">
                                 <Button onClick={handleSaveCustomInstructions} disabled={!currentChatId}>{language === "vi" ? "Lưu" : "Save"}</Button>       {/*  handle when and what. And check user message content and  SAVE! what you */}

                           <Button onClick={handleClearCustomInstructions} disabled = {!currentChatId}>        {/*handle with each easier, with custom, what you just clear origin by lines 788.*/}

                             {language === "vi" ? "Xóa" : "Clear"}

                             </Button>
                      </div>

                </CustomSettingsDrawer>

                 {showInfoModal && (             // IF want display when open -> keep modal with
                    <ModalOverlay onClick={() => setShowInfoModal(false)}>       {/* Click anywhere, it handle it for you! */}
                     <ModalContent darkMode={darkMode} onClick={(e) => e.stopPropagation()}>      {/* Display a modal if not handle */ }
                           <CloseButton onClick={() => setShowInfoModal(false)}>    {/* click, hide */ }
                             <X size={16} />  {/* origin props! */}
                           </CloseButton>     {/* CLOSE BUTTON  */}
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