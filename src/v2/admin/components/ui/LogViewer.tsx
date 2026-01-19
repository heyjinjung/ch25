import { ScrollArea } from "../../../components/ui/scroll-area";
import { cn } from "../../../lib/utils";

interface LogViewerProps {
  data: any;
  title?: string;
  className?: string;
}

export function LogViewer({ data, title, className }: LogViewerProps) {
  const jsonString = JSON.stringify(data, null, 2);

  // Simple syntax highlighting regex
  const highlighted = jsonString.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "text-orange-400"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-sky-400"; // key
        } else {
          cls = "text-emerald-400"; // string
        }
      } else if (/true|false/.test(match)) {
        cls = "text-purple-400"; // boolean
      } else if (/null/.test(match)) {
        cls = "text-zinc-500"; // null
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );

  return (
    <div className={cn("rounded-lg border border-white/5 bg-[#121214]", className)}>
      {title && (
        <div className="border-b border-white/5 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-400">
          {title}
        </div>
      )}
      <ScrollArea className="h-[300px] w-full">
        <pre
          className="p-4 text-xs font-mono leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </ScrollArea>
    </div>
  );
}
