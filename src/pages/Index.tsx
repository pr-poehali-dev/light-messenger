import { useState, useRef, useEffect } from 'react';
import AuthForm from '@/components/AuthForm';
import CreateChannelDialog from '@/components/CreateChannelDialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface User {
  id: number;
  username: string;
  email: string;
}

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  archived?: boolean;
  isChannel?: boolean;
}

interface SearchResult {
  users: { id: number; username: string; email: string }[];
  channels: { id: number; name: string; description: string }[];
}

interface Message {
  id: number;
  text?: string;
  time: string;
  sent: boolean;
  type: 'text' | 'image' | 'file';
  fileName?: string;
  fileUrl?: string;
}

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([
    {
      id: 1,
      name: 'Waffels Общий чат',
      avatar: '',
      lastMessage: 'Добро пожаловать в Waffels!',
      time: 'Сейчас',
      unread: 0,
      online: true,
      isChannel: true,
    },
  ]);
  const [searchResults, setSearchResults] = useState<SearchResult>({ users: [], channels: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('waffels_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  const handleAuth = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('waffels_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('waffels_user');
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults({ users: [], channels: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://functions.poehali.dev/43dbced9-3bed-40c2-bd40-cbe252402151?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleCreateChannel = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch('https://functions.poehali.dev/34a010d7-f9de-44c1-b772-63ef0109cccc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id.toString(),
        },
        body: JSON.stringify({
          action: 'create',
          name: newChannelName,
          description: newChannelDesc,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Канал создан',
          description: `Канал "${data.channel.name}" успешно создан!`,
        });
        setShowCreateChannel(false);
        setChats([...chats, {
          id: data.channel.id,
          name: data.channel.name,
          avatar: '',
          lastMessage: 'Канал создан',
          time: 'Сейчас',
          unread: 0,
          online: true,
          isChannel: true,
        }]);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать канал',
        variant: 'destructive',
      });
    }
  };

  if (!currentUser) {
    return <AuthForm onAuth={handleAuth} />;
  }

  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Привет! Как дела?', time: '14:20', sent: false, type: 'text' },
    { id: 2, text: 'Привет! Всё отлично, спасибо!', time: '14:21', sent: true, type: 'text' },
    { id: 3, text: 'Есть идея для нового проекта', time: '14:22', sent: false, type: 'text' },
    { id: 4, text: 'Отличная идея! Давай обсудим завтра', time: '14:23', sent: false, type: 'text' },
  ]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredChats = chats;

  const handleSendMessage = () => {
    if (messageText.trim()) {
      setMessages([
        ...messages,
        {
          id: messages.length + 1,
          text: messageText,
          time: new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          sent: true,
          type: 'text',
        },
      ]);
      setMessageText('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isImage = file.type.startsWith('image/');
      const fileUrl = URL.createObjectURL(file);
      setMessages([
        ...messages,
        {
          id: messages.length + 1,
          time: new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          sent: true,
          type: isImage ? 'image' : 'file',
          fileName: file.name,
          fileUrl: fileUrl,
        },
      ]);
    }
  };

  const startCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setIsCallActive(true);
    setCallDuration(0);
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  };

  const endCall = () => {
    setIsCallActive(false);
    setCallType(null);
    setCallDuration(0);
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-screen bg-background/80 backdrop-blur-sm font-['Inter']">
      <div className="w-80 border-r border-border flex flex-col bg-card/90 backdrop-blur-md">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">Waffels</h1>
              <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setShowCreateChannel(true)}>
                <Icon name="Plus" size={20} />
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Icon name="Archive" size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Архив чатов</SheetTitle>
                    <SheetDescription>
                      Старые и архивированные беседы
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-2">
                    {chats
                      .filter((chat) => chat.archived)
                      .map((chat) => (
                        <div
                          key={chat.id}
                          className="p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="font-medium">{chat.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {chat.lastMessage}
                          </div>
                        </div>
                      ))}
                  </div>
                </SheetContent>
              </Sheet>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Icon name="Settings" size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Профиль</SheetTitle>
                    <SheetDescription>
                      Настройки аккаунта и приложения
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div className="flex flex-col items-center gap-4">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-2xl">ВЫ</AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <h3 className="font-semibold text-lg">Вы</h3>
                        <p className="text-sm text-muted-foreground">
                          В сети
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Статус</h4>
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start">
                            <Icon name="Circle" size={16} className="mr-2 fill-green-500 text-green-500" />
                            В сети
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-medium mb-2">Настройки</h4>
                        <div className="space-y-2">
                          <Button variant="ghost" className="w-full justify-start">
                            <Icon name="Bell" size={16} className="mr-2" />
                            Уведомления
                          </Button>
                          <Button variant="ghost" className="w-full justify-start">
                            <Icon name="Lock" size={16} className="mr-2" />
                            Приватность
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={handleLogout}
                          >
                            <Icon name="LogOut" size={16} className="mr-2" />
                            Выйти
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="relative">
            <Icon
              name="Search"
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Поиск пользователей и каналов..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 pb-4 space-y-1">
            {isSearching && searchQuery.length >= 2 ? (
              <>
                {searchResults.users.length > 0 && (
                  <div className="px-2 py-2">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">ПОЛЬЗОВАТЕЛИ</h3>
                    {searchResults.users.map((user) => (
                      <div
                        key={`user-${user.id}`}
                        className="p-3 rounded-lg hover:bg-accent cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">@{user.username}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.channels.length > 0 && (
                  <div className="px-2 py-2">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">КАНАЛЫ</h3>
                    {searchResults.channels.map((channel) => (
                      <div
                        key={`channel-${channel.id}`}
                        className="p-3 rounded-lg hover:bg-accent cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              <Icon name="Hash" size={20} />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{channel.name}</p>
                            {channel.description && (
                              <p className="text-xs text-muted-foreground">{channel.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.users.length === 0 && searchResults.channels.length === 0 && (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    <Icon name="SearchX" size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Ничего не найдено</p>
                  </div>
                )}
              </>
            ) : (
              filteredChats
                .filter((chat) => !chat.archived)
                .map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-accent ${
                    activeChat?.id === chat.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={chat.avatar} />
                        <AvatarFallback>
                          {chat.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      {chat.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-medium truncate">{chat.name}</h3>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {chat.time}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage}
                      </p>
                    </div>
                    {chat.unread > 0 && (
                      <Badge className="bg-gradient-to-br from-orange-500 to-yellow-500 text-white border-0">
                        {chat.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col bg-background/60 backdrop-blur-sm">
        {activeChat ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between bg-card/70 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={activeChat.avatar} />
                    <AvatarFallback>
                      {activeChat.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  {activeChat.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold">{activeChat.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {activeChat.online ? 'В сети' : 'Был(а) недавно'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => startCall('audio')}
                  disabled={!activeChat.online}
                >
                  <Icon name="Phone" size={20} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => startCall('video')}
                  disabled={!activeChat.online}
                >
                  <Icon name="Video" size={20} />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-md ${
                        message.sent
                          ? 'bg-gradient-to-br from-orange-500 to-yellow-500 text-white'
                          : 'bg-card/90 backdrop-blur-sm'
                      }`}
                    >
                      {message.type === 'text' && <p>{message.text}</p>}
                      {message.type === 'image' && (
                        <img 
                          src={message.fileUrl} 
                          alt="Изображение" 
                          className="rounded-lg max-w-sm"
                        />
                      )}
                      {message.type === 'file' && (
                        <div className="flex items-center gap-2">
                          <Icon name="File" size={20} />
                          <span className="text-sm">{message.fileName}</span>
                        </div>
                      )}
                      <span
                        className={`text-xs mt-1 block ${
                          message.sent
                            ? 'text-white/80'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {message.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-card/70 backdrop-blur-md">
              <div className="max-w-3xl mx-auto flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.txt"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="Paperclip" size={20} />
                </Button>
                <Input
                  placeholder="Написать сообщение..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="icon" className="bg-gradient-to-br from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600">
                  <Icon name="Send" size={20} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Icon name="MessageSquare" size={64} className="mx-auto mb-4 opacity-50" />
              <p>Выберите чат для начала общения</p>
            </div>
          </div>
        )}
      </div>

      {isCallActive && activeChat && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500/95 to-yellow-500/95 backdrop-blur-lg z-50 flex items-center justify-center">
          <div className="w-full max-w-md p-8 space-y-6 text-center">
            <Avatar className="w-32 h-32 mx-auto">
              <AvatarImage src={activeChat.avatar} />
              <AvatarFallback className="text-4xl">
                {activeChat.name.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h2 className="text-2xl font-semibold mb-2 text-white">{activeChat.name}</h2>
              <p className="text-white/80 text-lg">
                {formatCallDuration(callDuration)}
              </p>
            </div>

            <div className="flex justify-center gap-4 pt-8">
              {callType === 'video' && (
                <Button
                  variant="outline"
                  size="icon"
                  className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 border-white/40 text-white"
                >
                  <Icon name="VideoOff" size={24} />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 border-white/40 text-white"
              >
                <Icon name="MicOff" size={24} />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="w-16 h-16 rounded-full bg-red-500/90 hover:bg-red-600/90"
                onClick={endCall}
              >
                <Icon name="PhoneOff" size={28} />
              </Button>
            </div>
          </div>
        </div>
      )}

      <CreateChannelDialog
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
        onSubmit={(name, desc) => {
          setNewChannelName(name);
          setNewChannelDesc(desc);
          handleCreateChannel();
        }}
      />
    </div>
  );
};

export default Index;