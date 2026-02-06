import { ChatWidget } from '@/components/widgets/core/ChatWidget'

export default function ChatPage() {
  return (
    <div className="container mx-auto p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">Chat with dea</h1>

        <div className="h-[600px]">
          <ChatWidget projectId={null} config={{}} editMode={false} />
        </div>

        <div className="mt-6 rounded-lg border border-border bg-muted p-4">
          <h2 className="mb-2 font-semibold">Testing Instructions</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Send a message in the chat above</li>
            <li>Message is saved to Supabase messages table (sender='user')</li>
            <li>
              dea Runtime (on VM) polls Supabase, finds unread message, processes
              it
            </li>
            <li>
              dea Runtime writes response to messages table (sender='dea',
              in_reply_to=&lt;your_message_id&gt;)
            </li>
            <li>ChatWidget receives response via Supabase Realtime and displays it</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            <strong>Note:</strong> dea Runtime must be running on VM for responses to
            appear. Current implementation has placeholder response logic (see
            dea_runtime.py process_message method).
          </p>
        </div>
      </div>
    </div>
  )
}
