import { ReactNode } from 'react'

interface Props { children: ReactNode }

export default function PhoneFrame({ children }: Props) {
  return (
    <div className="relative mx-auto" style={{ width: 390, height: 844 }}>
      {/* Outer shell */}
      <div
        className="absolute inset-0 rounded-[52px] shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
          boxShadow: '0 0 0 2px #3a3a3a, 0 30px 80px rgba(0,0,0,0.8)',
        }}
      />
      {/* Side buttons */}
      <div className="absolute left-[-3px] top-[130px] w-[3px] h-[34px] rounded-l-sm bg-[#2a2a2a]" />
      <div className="absolute left-[-3px] top-[180px] w-[3px] h-[65px] rounded-l-sm bg-[#2a2a2a]" />
      <div className="absolute left-[-3px] top-[255px] w-[3px] h-[65px] rounded-l-sm bg-[#2a2a2a]" />
      <div className="absolute right-[-3px] top-[165px] w-[3px] h-[95px] rounded-r-sm bg-[#2a2a2a]" />
      {/* Screen area */}
      <div
        className="absolute overflow-hidden flex flex-col"
        style={{
          top: 12, left: 12, right: 12, bottom: 12,
          borderRadius: 42,
          background: '#0d1b2a',
        }}
      >
        {/* Dynamic island */}
        <div
          className="absolute top-[14px] left-1/2 -translate-x-1/2 z-50"
          style={{ width: 126, height: 34, background: '#000', borderRadius: 20 }}
        />
        {children}
      </div>
    </div>
  )
}
