import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/athletes': 'Profil Atlet',
  '/fitness/strength': 'Kekuatan & Kondisioning',
  '/fitness/testing': 'Ujian Kecergasan',
  '/fitness/config': 'Konfigurasi Ujian Kecergasan per Sukan',
  '/performance/inbody': 'Penilaian InBody',
  '/performance/supplement': 'Pengurusan Suplemen',
  '/rehabilitation/physio': 'Saringan Fisioterapi',
  '/rehabilitation/physio/cases': 'Pengurusan Kes Fisioterapi',
  '/reports': 'Laporan',
  '/admin/users': 'Pengurusan Pengguna',
}

export default function Layout() {
  const { pathname } = useLocation()
  const athleteProfileMatch = pathname.match(/^\/athletes\/[^/]+$/)
  const title = routeTitles[pathname] ?? (athleteProfileMatch ? 'Profil Atlet' : 'MSP Sains Sukan')

  return (
    <div className="flex h-screen bg-[#F2F4F7]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-[17px] font-bold text-[#111]">{title}</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
