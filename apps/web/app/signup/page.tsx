"use client";

import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    alert("User created! Now login.");
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col gap-4 w-80">
        
        <h2 className="text-2xl font-bold">Signup</h2>

        <input
          type="email"
          placeholder="Email"
          className="border p-2"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="border p-2"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSignup}
          className="bg-black text-white p-2"
        >
          Signup
        </button>

      </div>
    </div>
  );
}