
import React, { useState, useEffect } from 'react';

interface InlineEditableProps {
  isAdmin: boolean;
  initialText: string;
  onSave: (newText: string) => void;
}

const InlineEditable: React.FC<InlineEditableProps> = ({ isAdmin, initialText, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleSave = () => {
    setIsEditing(false);
    if (text !== initialText) {
      onSave(text);
    }
  };

  if (!isAdmin) {
    return <span className="flex-1">{text}</span>;
  }

  if (isEditing) {
    return (
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setText(initialText);
            setIsEditing(false);
          }
        }}
        autoFocus
        className="w-full bg-yellow-100 border border-yellow-400 rounded-md px-2 py-1 text-black"
      />
    );
  }

  return (
    <span onClick={() => setIsEditing(true)} className="flex-1 cursor-pointer hover:bg-yellow-100 p-1 rounded-md">
      {text}
    </span>
  );
};

export default InlineEditable;
