// SearchUser.jsx
import React, { useState , useEffect} from "react";
import { useAuth } from "../context/AuthContext";
import debounce from "lodash.debounce";
const SearchUser = ({ setSelectedUser }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]); // store matched users
  const { token } = useAuth();

  const handleSearch = async (query) => {
    if (!query) {
      setResults([]);
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/chat/search-user?username=${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    }
  };

  const debouncedSearch = React.useMemo(() => debounce(handleSearch, 500), [token]);

  useEffect(() => {
    debouncedSearch(search);
    return () => debouncedSearch.cancel();
  }, [search, debouncedSearch]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearch(user.username); // update input to selected username
    setResults([]); // clear dropdown
  };

  return (
    <div className="search-container">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
        placeholder="Search user..."
      />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((user) => (
            <li
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="search-item"
            >
              {user.username}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchUser;