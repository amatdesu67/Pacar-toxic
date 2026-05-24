import Image from 'next/image';

interface TypingIndicatorProps {
  aiGender: 'female' | 'male';
  aiPhotoUrl?: string | null;
}

export function TypingIndicator({ aiGender, aiPhotoUrl }: TypingIndicatorProps) {
  const avatar = aiGender === 'female' ? '👩' : '👨';

  return (
    <div className="flex gap-2 mb-2 justify-start">
      <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center text-base flex-shrink-0 self-end mb-1 overflow-hidden relative">
        {aiPhotoUrl ? (
          <Image src={aiPhotoUrl} alt="avatar" fill className="object-cover" sizes="32px" />
        ) : (
          avatar
        )}
      </div>
      <div className="bg-[#202c33] rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-[#8696a0] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
