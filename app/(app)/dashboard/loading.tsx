export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-gray-200" />
    </div>
  )
}
