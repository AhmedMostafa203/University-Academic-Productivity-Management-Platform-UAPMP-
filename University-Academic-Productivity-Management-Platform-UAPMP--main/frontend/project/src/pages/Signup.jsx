import React, { useState } from 'react';
import Header from '../compnents/Header';
import Footer from '../compnents/Footer';
import { Link, useNavigate } from 'react-router-dom';

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate(); // عشان نروح صفحة Signin بعد التسجيل

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const data = { fullName, email, password };

    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      console.log(result);

      if(response.ok){
        alert("Account created successfully!");
        navigate("/"); // redirect لصفحة Signin بعد النجاح
      } else {
        alert(result.message || "Signup failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header/>
      <div className="flex-col flex-1 flex items-center justify-center py-8 px-4 m-14 gap-6">
        <div className='flex font-bold flex-col gap-3 items-center justify-center'>
          <p className='text-gray-800 text-4xl'>CREATE YOUR ACADEMIC ACCOUNT</p>
          <p className='text-gray-400 text-sm'>Join UAPMP manage your courses and grades efficiently</p>
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col items-center justify-center bg-white h-auto w-120 rounded-lg p-8 space-y-4'>
          <input 
            type="text" 
            placeholder="Full Name" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className='w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400'
          />
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400'
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className='w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400'
          />
          <input 
            type="password" 
            placeholder="Confirm Password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className='w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400'
          />
          <button type="submit" className='w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 shadow-md mt-4'>
            Sign up
          </button>

          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-gray-500">
            <span className="h-px w-16 bg-gray-300" />
            <span>Already have an account? <Link to='/'  className="text-blue-600 hover:underline">Sign in </Link> </span>
            <span className="h-px w-16 bg-gray-300" />
          </div>
        </form>
      </div>
      <Footer/>
    </div>
  );
};

export default Signup;