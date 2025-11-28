import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function VesselSelector({
  options = [],
  value = null,
  onChange,
  placeholder = "Select vessel",
  disabled = false,
}) {
  const [input, setInput] = useState(value?.name || "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [vesselOptions, setVesselOptions] = useState(options);
  const containerRef = useRef(null);
  // console.log(value);
  useEffect(() => {
    setVesselOptions(options);
  }, [options]);
  useEffect(() =>{
    setInput(value?.name || "");
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e) => {
      
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
        // console.log(e.target, "clicked outside");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // console.log("Vessel options", vesselOptions);
  const filteredOptions = vesselOptions.filter((v) =>
    v.name.toLowerCase().includes(input.toLowerCase())
  );

  const handleSelect = (vessel) => {
    onChange(vessel.id); // pass full object
    setInput(vessel.name);
    setDropdownOpen(false);
  };

  const handleAddNew = async (name) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_NETWORK}/setVessal`,
        {
          VessalNo: name, // only send the name as VessalNo
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "skip_zrok_interstitial": "true",
          },
          withCredentials: false,
        }
      );

      const newVessel = response.data;
      const updatedOptions = [...vesselOptions, newVessel];

      setVesselOptions(updatedOptions);
      onChange(newVessel);
      setInput(newVessel.name);
      setShowPopup(false);
      setDropdownOpen(false);
    } catch (error) {
      console.error("Failed to add vessel:", error);
      alert(error.response?.data?.detail || "Error adding vessel");
    }
  };


  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={input}
        disabled={disabled}
        onChange={(e) => {
          setInput(e.target.value);
          setDropdownOpen(true);
          onChange(null); // reset
        }}
        onFocus={() => !disabled && setDropdownOpen(true)}
        placeholder={placeholder}
        className={`w-full border px-3 py-1.5 rounded focus:outline-none focus:ring-2 ${
          disabled ? "bg-gray-100 text-gray-500" : "focus:ring-blue-500"
        }`}
      />

      {dropdownOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-10 w-full max-h-48 overflow-y-auto border mt-1 rounded shadow bg-white dark:bg-slate-900 ">
          {filteredOptions.map((v) => (
            <li
              key={v.id}
              className="px-3 py-2 cursor-pointer hover:bg-blue-100"
              onClick={() => handleSelect(v)}
            >
              {v.name}
            </li>
          ))}
        </ul>
      )}

      {dropdownOpen && input && filteredOptions.length === 0 && (
        <button
          type="button"
          onClick={() => setShowPopup(true)}
          className="mt-2 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
        >
          Add "{input}" as new vessel
        </button>
      )}

      {showPopup && (
        <AddVesselPopup
          name={input}
          onAdd={handleAddNew}
          onCancel={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}

function AddVesselPopup({ name, onAdd, onCancel }) {
  const [newName, setNewName] = useState(name);

  return (
    <div className="fixed inset-0 z-20 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="p-6 rounded-lg shadow-xl w-96 bg-white dark:bg-slate-900">
        <h2 className="text-lg font-semibold mb-4">Add New Vessel</h2>
        <input
          className="w-full border px-3 py-2 rounded mb-4"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Vessel name"
        />
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => onAdd(newName)}
            disabled={!newName.trim()}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
