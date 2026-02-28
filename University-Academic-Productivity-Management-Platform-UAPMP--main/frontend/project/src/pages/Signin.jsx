import React, { useState } from "react";
import Header from "../compnents/Header";
import Footer from "../compnents/Footer";
import { useNavigate, Link } from "react-router-dom";

const Signin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // عشان نروح الصفحة بعد login

  const handleLogin = async (e) => {
    e.preventDefault();

    const data = { email, password };

    try {
      const response = await fetch("http://localhost:5000/api/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // لو البيانات صح
        console.log("Login successful", result);
        // ممكن تخزن token لو موجود
        // localStorage.setItem("token", result.token);

        // انتقل للصفحة الرئيسية / Home
        navigate("/Home");
      } else {
        // بيانات غلط
        alert(result.message || "Invalid email or password");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex items-center justify-center py-8 px-4 mt-14">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8 ">
            <div className="flex flex-row justify-center items-center gap-4 mb-4">
              <div className="bg-blue-400 px-2 py-1 text-white font-bold rounded-lg ">
                <p>U</p>
              </div>
              <div className="font-bold">UAPMP</div>
            </div>
            <h5 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Sign in to UAPMP
            </h5>
            <p className="text-center text-gray-500 text-sm mb-8">
              Enter your academic credentials to access the portal
            </p>

            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  University Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="student@university.edu"
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="*********"
                  dir="ltr"
                  required
                />
                <div className="text-right mt-2">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {/* الزر الآن يستخدم handleLogin وليس Link */}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                Log In
              </button>

              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-sm text-gray-500 font-semibold uppercase tracking-wide">
                  OR CONTINUE WITH
                </span>
                <Link
                  to="/Signup"
                  className="text-blue-600 hover:text-blue-800"
                >
                  SIGN UP?
                </Link>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Signin;