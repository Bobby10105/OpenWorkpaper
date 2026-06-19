'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo, Redo } from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
}

const MenuButton = ({
  onClick,
  disabled,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded hover:bg-gray-200 transition-colors ${
      isActive ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
    } disabled:opacity-30`}
    title={title}
    aria-label={title}
  >
    {children}
  </button>
);

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 border-b border-gray-100 bg-gray-50/50 rounded-t-xl transition-all">
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline"
      >
        <UnderlineIcon className="w-4 h-4" />
      </MenuButton>
      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </MenuButton>
      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
      <MenuButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        title="Undo"
      >
        <Undo className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        title="Redo"
      >
        <Redo className="w-4 h-4" />
      </MenuButton>
    </div>
  );
};

function useRichTextEditorSetup({
  value,
  onChange,
  readOnly = false,
  onFocus,
  onBlur,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: value,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus,
    onBlur,
  });

  // Sync content if it changes externally (important for the Sync Guard)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  // Update readOnly state if it changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  return editor;
}

export default function RichTextEditor(props: RichTextEditorProps) {
  const { readOnly = false } = props;
  const editor = useRichTextEditorSetup(props);

  if (!editor) {
    return <div className="w-full h-[250px] bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />;
  }

  return (
    <div className={`flex flex-col w-full border border-gray-100 rounded-2xl overflow-hidden transition-all ${!readOnly ? 'bg-white' : 'bg-transparent border-transparent'}`}>
      {!readOnly && <MenuBar editor={editor} />}
      <EditorContent 
        editor={editor} 
        className="flex-1 min-h-[200px] cursor-text"
      />
      <style jsx global>{`
        .tiptap {
          outline: none;
          min-height: 200px;
          padding: 1.5rem;
          font-size: 1rem;
          line-height: 1.8;
          color: #1e293b;
        }
        .tiptap p {
          margin-bottom: 1rem;
        }
        .tiptap ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .tiptap ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .tiptap blockquote {
          border-left: 3px solid #e2e8f0;
          padding-left: 1rem;
          margin-bottom: 1rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
