import React from 'react'
import { Link } from 'react-router-dom' // لو بتستخدم React Router

const Header = () => {
  return (
    <header className="fixed top-0 left-0 w-full bg-gray-100 text-white z-50">
      <div className="flex items-center justify-between px-4 sm:px-8 h-14 max-w-7xl mx-auto">
        {/* Left - Logo */}
        <div className="flex items-center gap-2 font-semibold text-lg">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white">U</span>
          </div>
          <span className="text-gray-800">UAPMP</span>
        </div>

        {/* Center - Empty (for spacing) */}
        <div className="flex-1"></div>

        {/* Right - Navigation */}
        <nav className="flex items-center gap-6">
          
          <Link 
            to="" 
            className="bg-blue-500 text-white px-2 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium">
            <img className='w-5 text-white'  src='../src/assets/sun-svgrepo-com (1).svg'/>
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default Header