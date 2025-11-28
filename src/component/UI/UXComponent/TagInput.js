import React, { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";
import axios from "axios";

const MaterialTagSelector = ({
  value = [],
  onChange,
  options = [],
  disabled = false,
  onNewMaterialCreated, // ✅ <-- add this prop
}) => {
  const [materialOptions, setMaterialOptions] = useState([]);

  useEffect(() => {
    setMaterialOptions(options);
  }, [options]);

  const selected = value
    .map((id) => {
      const found = materialOptions.find((opt) => opt.id === id);
      return found ? { value: found.id, label: found.name } : null;
    })
    .filter(Boolean);

  const handleChange = (selectedOptions) => {
    const ids = selectedOptions?.map((opt) => opt.value) || [];
    onChange(ids);
  };

  const handleCreate = async (input) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_NETWORK}/setMaterial`,
        { material: input },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "skip_zrok_interstitial": "true",
          },
          withCredentials: true,
        }
      );

      // ✅ Instead of locally mutating options, just tell parent to reload
      onNewMaterialCreated?.()
      // if (onNewMaterialCreated) {
      //   onNewMaterialCreated(); // triggers re-fetch in parent
      // }
    } catch (err) {
      console.error("Material creation failed", err);
      alert("Could not create material");
    }
  };

  return (
    <CreatableSelect
      isMulti
      isDisabled={disabled}
      value={selected}
      onChange={handleChange}
      onCreateOption={handleCreate}
      options={materialOptions.map((mat) => ({
        value: mat.id,
        label: mat.name,
      }))}
      placeholder="Type or select material"
      className="text-sm"
      classNamePrefix="material-select"
    />
  );
};


export default MaterialTagSelector;
