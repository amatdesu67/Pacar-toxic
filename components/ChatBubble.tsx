import Image from 'next/image';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  createdAt: string;
}

interface ChatBubbleProps {
  message: Message;
  aiGender: 'female' | 'male';
  aiPhotoUrl?: string | null;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`(.*?)`/g, '$1');
}

export function ChatBubble({ message, aiGender, aiPhotoUrl }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const time = new Date(message.createdAt).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const aiAvatar = aiGender === 'female' ? '👩' : '👨';
  const content = stripMarkdown(message.content);

  return (
    <div className={`flex gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center text-base flex-shrink-0 self-end mb-1 overflow-hidden relative">
          {aiPhotoUrl ? (
            <Image src={aiPhotoUrl} alt="avatar" fill className="object-cover" sizes="32px" />
          ) : (
            aiAvatar
          )}
        </div>
      )}

      <div
        className={`max-w-[75%] px-3 py-2 rounded-2xl ${
          isUser
            ? 'bg-[#005c4b] rounded-br-sm'
            : 'bg-[#202c33] rounded-bl-sm'
        }`}
      >
        <p className="text-[#e9edef] text-sm leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
        <p className={`text-[10px] mt-0.5 select-none ${isUser ? 'text-[#8696a0] text-right' : 'text-[#8696a0]'}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
