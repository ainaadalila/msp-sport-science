export default function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1 bg-transparent text-white text-xs font-semibold">
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
          <rect x="0" y="4" width="3" height="8" rx="1" opacity="0.4"/>
          <rect x="4" y="2.5" width="3" height="9.5" rx="1" opacity="0.6"/>
          <rect x="8" y="1" width="3" height="11" rx="1" opacity="0.8"/>
          <rect x="12" y="0" width="3" height="12" rx="1"/>
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="white">
          <path d="M7.5 2.5C9.5 2.5 11.3 3.3 12.6 4.6L14 3.2C12.3 1.5 10 0.5 7.5 0.5C5 0.5 2.7 1.5 1 3.2L2.4 4.6C3.7 3.3 5.5 2.5 7.5 2.5Z" opacity="0.4"/>
          <path d="M7.5 5C8.8 5 10 5.5 10.9 6.4L12.3 5C11 3.7 9.3 3 7.5 3C5.7 3 4 3.7 2.7 5L4.1 6.4C5 5.5 6.2 5 7.5 5Z" opacity="0.7"/>
          <circle cx="7.5" cy="9" r="2"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" strokeOpacity="0.35"/>
          <rect x="2" y="2" width="17" height="8" rx="2" fill="white"/>
          <path d="M23 4.5V7.5C23.8 7.2 24.5 6.5 24.5 6C24.5 5.5 23.8 4.8 23 4.5Z" fill="white" fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  )
}
