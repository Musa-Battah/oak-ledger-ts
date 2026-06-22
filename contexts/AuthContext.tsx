const checkAuth = async () => {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      setState({
        user: data.user,
        token: data.token || null,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  } catch (error) {
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }
};