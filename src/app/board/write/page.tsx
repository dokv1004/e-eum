"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  Send,
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  ImagePlus,
  Link2,
  Paperclip,
  Undo2,
  Redo2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const categories = [
  { id: "eagle", label: "이글", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "wingwing", label: "윙윙", color: "bg-green-100 text-green-700 border-green-200" },
  { id: "youth", label: "청년부", color: "bg-purple-100 text-purple-700 border-purple-200" },
];

export default function WritePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("eagle");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      alert("로그인이 필요합니다.");
      router.replace("/board");
    }
  }, [authLoading, user, router]);

  const uploadToStorage = useCallback(
    async (file: File, folder: string): Promise<string | null> => {
      if (!user) return null;
      setUploading(true);
      const filename = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `${folder}/${filename}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setUploading(false);
      return url;
    },
    [user],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({ inline: false }),
      TiptapLink.configure({ openOnClick: false }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[300px] px-5 py-4 focus:outline-none text-base sm:text-lg",
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (files?.length) {
          event.preventDefault();
          Array.from(files).forEach((file) => {
            if (file.type.startsWith("image/")) {
              uploadToStorage(file, "posts").then((url) => {
                if (url) {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: url }),
                    ),
                  );
                }
              });
            }
          });
          return true;
        }
        return false;
      },
      handlePaste(view, event) {
        const files = event.clipboardData?.files;
        if (files?.length) {
          event.preventDefault();
          Array.from(files).forEach((file) => {
            if (file.type.startsWith("image/")) {
              uploadToStorage(file, "posts").then((url) => {
                if (url) {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: url }),
                    ),
                  );
                }
              });
            }
          });
          return true;
        }
        return false;
      },
    },
  });

  const handleImageButton = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file && editor) {
        const url = await uploadToStorage(file, "posts");
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    };
    input.click();
  }, [editor, uploadToStorage]);

  const handleFileButton = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file && editor) {
        const url = await uploadToStorage(file, "files");
        if (url) {
          editor
            .chain()
            .focus()
            .insertContent(
              `<p><a href="${url}" target="_blank" rel="noopener noreferrer">📎 ${file.name}</a></p>`,
            )
            .run();
        }
      }
    };
    input.click();
  }, [editor, uploadToStorage]);

  const handleLinkButton = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("링크 URL을 입력하세요");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const handleSubmit = async () => {
    if (!user || !title.trim() || !editor) return;
    setSaving(true);
    await addDoc(collection(db, "posts"), {
      title: title.trim(),
      content: editor.getHTML(),
      category,
      authorName: user.displayName || user.email?.split("@")[0] || "익명",
      authorId: user.uid,
      createdAt: serverTimestamp(),
    });
    router.push("/board");
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
        <Skeleton className="h-10 w-32 rounded-lg mb-8" />
        <Skeleton className="h-125 w-full rounded-[2rem]" />
      </div>
    );
  }

  const toolbarButtons = editor
    ? [
        {
          icon: Bold,
          action: () => editor.chain().focus().toggleBold().run(),
          active: editor.isActive("bold"),
          title: "굵게",
        },
        {
          icon: Italic,
          action: () => editor.chain().focus().toggleItalic().run(),
          active: editor.isActive("italic"),
          title: "기울임",
        },
        { divider: true },
        {
          icon: List,
          action: () => editor.chain().focus().toggleBulletList().run(),
          active: editor.isActive("bulletList"),
          title: "목록",
        },
        {
          icon: ListOrdered,
          action: () => editor.chain().focus().toggleOrderedList().run(),
          active: editor.isActive("orderedList"),
          title: "번호 목록",
        },
        { divider: true },
        {
          icon: ImagePlus,
          action: handleImageButton,
          active: false,
          title: "이미지",
        },
        {
          icon: Paperclip,
          action: handleFileButton,
          active: false,
          title: "파일 첨부",
        },
        {
          icon: Link2,
          action: handleLinkButton,
          active: editor.isActive("link"),
          title: "링크",
        },
        { divider: true },
        {
          icon: Undo2,
          action: () => editor.chain().focus().undo().run(),
          active: false,
          title: "실행취소",
        },
        {
          icon: Redo2,
          action: () => editor.chain().focus().redo().run(),
          active: false,
          title: "다시실행",
        },
      ]
    : [];

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-6 sm:mb-8">
        글쓰기
      </h1>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* 카테고리 칩 + 제목 */}
        <div className="p-5 sm:p-6 space-y-4 border-b border-slate-100">
          {/* 카테고리 칩 UI */}
          <div>
            <p className="text-sm font-bold text-slate-500 mb-2.5">카테고리</p>
            <div className="flex gap-2 sm:gap-3">
              {categories.map((c) => {
                const isActive = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-sm sm:text-base border-2 transition-all ${
                      isActive
                        ? `${c.color} shadow-sm scale-105`
                        : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 제목 */}
          <input
            type="text"
            value={title || ""}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-xl sm:text-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        {/* 에디터 툴바 */}
        {editor && (
          <div className="flex items-center flex-wrap gap-0.5 px-3 sm:px-4 py-2 border-b border-slate-100 bg-slate-50/80">
            {toolbarButtons.map((btn, i) =>
              "divider" in btn ? (
                <div
                  key={`d-${i}`}
                  className="w-px h-5 bg-slate-200 mx-1"
                />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={btn.action}
                  title={btn.title}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-colors ${
                    btn.active
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                  }`}
                >
                  <btn.icon className="w-4 h-4" />
                </button>
              ),
            )}

            {/* 업로드 중 표시 */}
            {uploading && (
              <div className="flex items-center gap-1.5 ml-auto text-sm font-bold text-blue-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                업로드 중...
              </div>
            )}
          </div>
        )}

        {/* 에디터 본문 */}
        <EditorContent editor={editor} />

        {/* 등록 버튼 */}
        <div className="p-5 sm:p-6 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || uploading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black text-lg transition-colors"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {saving ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
