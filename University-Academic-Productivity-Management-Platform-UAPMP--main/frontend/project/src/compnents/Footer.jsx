// compnents/Footer.jsx
import React from 'react'

const Footer = () => {
  return (
    <footer className='bg-white border-t border-gray-200 py-6'>
      <div className='container mx-auto px-4'>
        <div className='flex flex-col sm:flex-row justify-between items-center gap-4'>
          <p className='text-sm text-gray-600'>
            © 2026 University Academic Management Platform.
          </p>
          <div className='flex items-center gap-2'>
            <span className='text-sm text-gray-600'>Need help?</span>
            <button className='text-sm text-blue-600 hover:text-blue-800 hover:underline'>
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer