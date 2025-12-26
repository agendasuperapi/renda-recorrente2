import { useRef, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Digite o conteúdo aqui...",
  className = "",
}: RichTextEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);

  // Handler para upload de imagem
  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB");
        return;
      }

      try {
        toast.loading("Enviando imagem...", { id: "image-upload" });

        // Gerar nome único para o arquivo
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `training-content/${fileName}`;

        // Upload para o Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("training-images")
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          // Se o bucket não existir, usar URL temporária
          console.error("Upload error:", uploadError);
          
          // Criar URL local temporária para preview
          const localUrl = URL.createObjectURL(file);
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, "image", localUrl);
            quill.setSelection(range.index + 1, 0);
          }
          toast.dismiss("image-upload");
          toast.warning("Imagem adicionada localmente (bucket não configurado)");
          return;
        }

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from("training-images")
          .getPublicUrl(filePath);

        // Inserir imagem no editor
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, "image", urlData.publicUrl);
          quill.setSelection(range.index + 1, 0);
        }

        toast.dismiss("image-upload");
        toast.success("Imagem adicionada com sucesso!");
      } catch (error) {
        console.error("Erro ao fazer upload:", error);
        toast.dismiss("image-upload");
        toast.error("Erro ao enviar imagem");
      }
    };
  };

  // Configuração dos módulos do Quill
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          [{ font: [] }],
          [{ size: ["small", false, "large", "huge"] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ script: "sub" }, { script: "super" }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ direction: "rtl" }],
          [{ align: [] }],
          ["blockquote", "code-block"],
          ["link", "image", "video"],
          ["clean"],
        ],
        handlers: {
          image: imageHandler,
        },
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    []
  );

  const formats = [
    "header",
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "script",
    "list",
    "bullet",
    "indent",
    "direction",
    "align",
    "blockquote",
    "code-block",
    "link",
    "image",
    "video",
  ];

  return (
    <div className={`rich-text-editor ${className}`}>
      <style>{`
        .rich-text-editor .ql-container {
          min-height: 200px;
          font-size: 16px;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: hsl(var(--muted));
        }
        .rich-text-editor .ql-editor {
          min-height: 200px;
          background: hsl(var(--background));
        }
        .rich-text-editor .ql-toolbar.ql-snow,
        .rich-text-editor .ql-container.ql-snow {
          border-color: hsl(var(--border));
        }
        .rich-text-editor .ql-snow .ql-picker-label,
        .rich-text-editor .ql-snow .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        .rich-text-editor .ql-snow .ql-fill {
          fill: hsl(var(--foreground));
        }
        .rich-text-editor .ql-snow .ql-picker-options {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        .rich-text-editor .ql-snow .ql-picker-label:hover,
        .rich-text-editor .ql-snow button:hover {
          color: hsl(var(--primary));
        }
        .rich-text-editor .ql-snow button:hover .ql-stroke {
          stroke: hsl(var(--primary));
        }
        .rich-text-editor .ql-snow button:hover .ql-fill {
          fill: hsl(var(--primary));
        }
        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
      `}</style>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
};
