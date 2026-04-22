(function () {
  function jsonHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  function parseErrorPayload(payload) {
    if (!payload || typeof payload !== "object") {
      return "An unknown error occurred.";
    }

    var lines = [];
    Object.keys(payload).forEach(function (key) {
      var val = payload[key];
      if (Array.isArray(val)) {
        lines.push(key + ": " + val.join("; "));
      } else if (typeof val === "string") {
        lines.push(key + ": " + val);
      }
    });
    return lines.length ? lines.join("\n") : "An unknown error occurred.";
  }

  function setMessage(el, text, kind) {
    el.textContent = text;
    el.classList.remove("ok", "error");
    if (kind) {
      el.classList.add(kind);
    }
  }

  function initRegister() {
    var form = document.getElementById("register-form");
    var message = document.getElementById("register-message");
    if (!form || !message) {
      return;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      setMessage(message, "Creating account...", null);

      var formData = new FormData(form);
      var payload = Object.fromEntries(formData.entries());

      try {
        var res = await fetch("/api/auth/register/", {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify(payload),
        });

        var data = await res.json();

        if (res.ok) {
          setMessage(
            message,
            "Registration successful. Redirecting to login page in 1.5s...",
            "ok",
          );
          setTimeout(function () {
            window.location.href = "/login/";
          }, 1500);
          return;
        }

        setMessage(message, parseErrorPayload(data), "error");
      } catch (err) {
        setMessage(message, "Cannot connect to server.", "error");
      }
    });
  }

  function initLogin() {
    var form = document.getElementById("login-form");
    var message = document.getElementById("login-message");
    if (!form || !message) {
      return;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      setMessage(message, "Logging in...", null);

      var formData = new FormData(form);
      var payload = Object.fromEntries(formData.entries());

      try {
        var res = await fetch("/api/auth/login/", {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify(payload),
        });

        var data = await res.json();

        if (res.ok && data.token) {
          // Lưu token vào cookie thay vì localStorage
          var localHosts = ["localhost", "127.0.0.1", "::1"];
          var isLocalDev = localHosts.includes(window.location.hostname);
          var secureFlag = isLocalDev ? "" : "; Secure";
          document.cookie = "auth_token=" + data.token + "; path=/; max-age=604800; samesite=lax" + secureFlag;
          setMessage(message, "Login successful. Redirecting...", "ok");
          
          // Chuyển hướng về trang chủ sau khi đăng nhập thành công
          setTimeout(function () {
            window.location.href = "/";
          }, 1000);
          return;
        }

        setMessage(message, parseErrorPayload(data), "error");
      } catch (err) {
        setMessage(message, "Cannot connect to server.", "error");
      }
    });
  }

  window.AuthPages = {
    initLogin: initLogin,
    initRegister: initRegister,
  };
})();
