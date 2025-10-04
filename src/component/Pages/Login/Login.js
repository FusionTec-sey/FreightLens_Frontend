import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Truck, Lock, Eye, EyeOff, Package, Ship } from "lucide-react";

const LoginPage = () => {
  const { login, token } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const usernameRef = useRef(null);
  const desktopCanvasRef = useRef(null);
  const mobileCanvasRef = useRef(null);

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true });
    usernameRef.current?.focus();
  }, [token, navigate]);

  // === Background particle animation ===
  useEffect(() => {
    const startParticles = (canvas) => {
      if (!canvas) return () => {};
      const ctx = canvas.getContext("2d");
      if (!ctx) return () => {};

      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      let raf = 0;
      let width = 0;
      let height = 0;

      const PARTICLE_COUNT = Math.max(24, Math.floor((window.innerWidth * window.innerHeight) / 50000));
      const SPEED_MIN = 0.15;
      const SPEED_MAX = 0.6;

      const particles = [];
      const rand = (a, b) => a + Math.random() * (b - a);

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        width = Math.max(1, Math.floor(rect.width));
        height = Math.max(1, Math.floor(rect.height));
        canvas.width = Math.floor(width * DPR);
        canvas.height = Math.floor(height * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      };

      const spawnParticle = () => ({
        x: rand(0, width),
        y: rand(0, height),
        r: rand(1.2, 2.2),
        vx: rand(SPEED_MIN, SPEED_MAX) * (Math.random() < 0.5 ? 1 : -1),
        vy: rand(SPEED_MIN, SPEED_MAX) * (Math.random() < 0.5 ? 1 : -1),
        alpha: rand(0.4, 0.9),
      });

      const init = () => {
        particles.length = 0;
        for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(spawnParticle());
      };

      const step = () => {
        ctx.clearRect(0, 0, width, height);
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
          ctx.fill();
        }
        raf = requestAnimationFrame(step);
      };

      resize();
      init();
      step();

      const onResize = () => {
        resize();
        init();
      };
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
      };
    };

    const stopDesktop = startParticles(desktopCanvasRef.current);
    const stopMobile = startParticles(mobileCanvasRef.current);
    return () => {
      stopDesktop && stopDesktop();
      stopMobile && stopMobile();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in both username and password.");
      return;
    }

    setIsLoading(true);
    try {
      const body = new URLSearchParams();
      body.append("username", username);
      body.append("password", password);

      const response = await axios.post(
        `${process.env.REACT_APP_NETWORK}/token`,
        body.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const data = response.data;
      login(data.access_token, data.refresh_token, data.permissions || [], username);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const errorMessage = err.response?.data?.detail || "Login failed";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row relative overflow-hidden ">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-blue-800 to-indigo-900 z-0" />

      {/* Full-page World Map Watermark */}
      <div className="absolute inset-0 pointer-events-none flex justify-center items-center z-0">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg"
          alt="world map watermark"
          className="w-full h-full object-contain"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 0.03,
          }}
        />
      </div>

      {/* Particles */}
      <canvas ref={desktopCanvasRef} className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-10" />
      <canvas ref={mobileCanvasRef} className="md:hidden absolute inset-0 w-full h-full pointer-events-none z-10" />

      {/* LEFT: Branding */}
      <div className="hidden md:flex w-1/2 relative text-white z-20">
        <div className="relative flex flex-col justify-center items-center p-10 text-center">
          <Truck className="w-20 h-20 mb-6 drop-shadow-lg" />
          <h1 className="text-5xl font-extrabold tracking-tight">Freightliner</h1>
          <p className="mt-4 text-lg text-gray-100 max-w-md">
            Freight tracking & operations, streamlined in one platform.
          </p>
        </div>
      </div>

      {/* RIGHT: Login card */}
      <div className="flex flex-grow w-full md:w-1/2 justify-center items-center px-4 py-12 md:py-0 relative z-20">
        {/* Floating freight icons */}
        <div className="absolute inset-0 pointer-events-none opacity-15">
          <Package className="w-12 h-12 text-white absolute top-1/4 left-10 animate-float-slow" />
          <Ship className="w-14 h-14 text-white absolute bottom-1/4 right-12 animate-float-slower" />
        </div>

        {/* Glassmorphic login card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl w-full max-w-md p-8 shadow-lg relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white drop-shadow-lg">Welcome Back</h2>
            <p className="text-gray-200 text-sm mt-1">Login to your Freightliner account</p>
          </div>

          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-1">Username</label>
              <input
                ref={usernameRef}
                id="username"
                type="text"
                placeholder="Enter your username"
                className="w-full pl-4 pr-4 py-4 rounded-xl bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:ring-2 focus:ring-teal-400"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-10 py-4 rounded-xl bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:ring-2 focus:ring-teal-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="text-right text-sm">
              {/* <a href="/forgot-password" className="text-teal-300 hover:underline">Forgot Password?</a> */}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:scale-[1.03] transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-300">
            Trouble logging in?{" "}
            <span className="text-teal-300 hover:underline cursor-pointer">Contact Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
