
import React from "react";
import { Routes, Route } from "react-router-dom";
import Signin from "./pages/Signin";
import Signup from "./pages/Signup";
import Home from './pages/Home';
function App() {

  return (
    <>

      <Routes>
        <Route path="/" element={<Signin/>}/>
        <Route path="/Signup" element={<Signup/>}/>
        <Route path="/Home" element={<Home/>}/>
      </Routes>
    {/* </div> */}
    </>
   
  );
};

export default App

