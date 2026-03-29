import { useRef, useEffect, useState } from "react";
import axios from "axios";
import TypableSelect from "../../UI/UXComponent/TypebleSelect.js";
// import { getAllOptions } from "../../../utils/optionCache.js";
// import VesselSelector from "../../UI/AddSelect.js";
import MaterialTagSelector from "../../UI/UXComponent/TagInput.js";
import GenericSelector from    "../../UI/UXComponent/GenericSelector.js";
import { useOptions } from "../../../hooks/useOptions";
import { useTheme } from "../../../context/ThemeContext";

function ContainerEntryForm({
  editData,
  onSubmitSuccess,
  onCancel,
  userPermissions = [],
  handleDeleteFunction=null,
  mode = "edit" // "add" or "edit"
 }) {
    // console.log("Edit Data in ContainerEntryForm:", onSubmitSuccess);
    const { theme } = useTheme();
    const {
      suppliers,
      consignees,
      emptyLocations,
      status: statusOptions,
      type,
      shipping,
      vessal: vesselList,
      material: materialOptions,
      refresh,
      loading: optionsLoading,
      errors: optionErrors
    } = useOptions();



  // console.log("ContainerEntryForm rendered with editData:", editData);
  const [formData, setFormData] = useState({
    container_id: null,
    consignee: null,
    PONo: null,
    supplier: null,
    shippingType: null,
    material: [],
    arrivalDate: null,
    arrivalTime: null,
    vessal: null,
    type: null,
    containerNo: null,
    in_bound: null,
    empty_date: null,
    out_bound: null,
    unloaded_at_port: null,
    emptied_at: null,
    note: null,
    tax: 0,
    status: null,
    provider: null,
  });
  const [originalData, setOriginalData] = useState({});
  const [documents, setDocuments] = useState([]);
  const fileInputRef = useRef(null);
  const [removedDocIds, setRemovedDocIds] = useState([]);
  const [inboundImages, setInboundImages] = useState([]);
  const [emptyImages, setEmptyImages] = useState([]);

  const inboundInputRef = useRef(null);
  const emptyInputRef = useRef(null);
  const [selectedVessel, setSelectedVessel] = useState([]);


  useEffect(() => {
    if (editData) {
      const matchedVessel = vesselList.find(
        (v) => v.id === editData.VessalID 
      );

      // const bill = editData.bill_of_landing || {};

      // const [arrivalDate, arrivalTime] = bill.ArrivalDate
      //   ? bill.ArrivalDate.split('T')
      //   : ["", ""];

      setFormData((prev) => ({
        ...prev,
        ...editData,
        container_id: editData.Container_ID,
        containerNo: editData.container_no || "",
        PONo: editData.PONo || "",
        note: editData.note || "",
        // consignee: consignees.find((opt) => opt.name === bill?.consignee_name)?.id || "",
        // supplier: suppliers.find((opt) => opt.name ===  bill?.supplier_name)?.id || "",
        // arrival_on_port: bill?.ArrivalDate?.slice(0, 16) || "",
        // shippingType: shipping.find((opt) => opt.name === bill?.Doc_name)?.id || "",
        // vessal: vesselList.find((opt) => opt.name === bill?.vessel_name)?.id || "",
        
        type: type.find((opt) => opt.name === editData.containerType)?.id || "",
        material: editData.materials?.map(item => item.Id) || [],
        status: statusOptions.find((opt) => opt.name === editData.state)?.id || [],
        in_bound: editData.in_bound?.slice(0, 16),
        empty_date: editData.empty_date,
        out_bound: editData.out_bound?.slice(0, 16),
        unloaded_at_port: editData.unloaded_at_port,
        emptied_at: emptyLocations.find((opt) => opt.name === editData.location)?.id || []
      }));
      // console.log(formData.status, "sjkdfbh")
      // console.log(shipping.find((opt) => opt.name === bill?.Doc_name) , "jf")
      setOriginalData({
        ...editData,
        container_id: editData.Container_ID,
        vessal: matchedVessel || ""
      });

      // Documents setup
      if (editData.documents) {
        const formattedDocs = editData.documents
          .filter((doc) => doc.Type === "D")
          .map((doc) => ({
            isExisting: true,
            file_path: doc.path,
            id: doc.docs_id,
            type: doc.Type
          }));
        setDocuments(formattedDocs);

        const inbound = editData.documents
          .filter((doc) => doc.Type === "AD")
          .map((img) => ({
            isExisting: true,
            file_path: img.path,
            id: img.docs_id
          }));
        setInboundImages(inbound);

        const empty = editData.documents
          .filter((doc) => doc.Type === "ED")
          .map((img) => ({
            isExisting: true,
            file_path: img.path,
            id: img.docs_id
          }));
        setEmptyImages(empty);
      }
    }

  }, [editData, vesselList]);

  const handleInboundImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      const wrapped = files?.map(file => ({ file }));
      setInboundImages(prev => [...prev, ...wrapped]);
    }
  };

  const handleEmptyImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      const wrapped = files?.map(file => ({ file }));
      setEmptyImages(prev => [...prev, ...wrapped]);
    }
  };

  // const handleRemove = () => {
  //   if (onRemove && typeof index === 'number') {
  //     onRemove(index);
  //   }
  // };

  // console.log(userPermissions, "User Permissions in ContainerEntryForm");
  const hasViewPermission = (field) => userPermissions.includes(`View_${field}`);
  const hasEditPermission = (field) => userPermissions.includes(`Edit_${field}`);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const removeInboundImage = (index) => {
    setInboundImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeEmptyImage = (index) => {
    setEmptyImages(prev => prev.filter((_, i) => i !== index));
  };


  const handleAddNewFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocuments((prev) => [...prev, { file }]);
    e.target.value = "";
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const removeDocumentInput = (index) => {
    setDocuments((docs) => {
      const docToRemove = docs[index];
      if (docToRemove.isExisting && docToRemove.id) {
        setRemovedDocIds((prev) => [...prev, docToRemove.id]);
      }
      return docs.filter((_, i) => i !== index);
    });
    
  };

  const removeInboundImageInput = (index) => {
    setInboundImages((docs) => {
      const docToRemove = docs[index];
      if (docToRemove.isExisting && docToRemove.id) {
        setRemovedDocIds((prev) => [...prev, docToRemove.id]);
      }
      return docs.filter((_, i) => i !== index);
    });
    
  };

  const removeEmptyImageInput = (index) => {
    setEmptyImages((docs) => {
      const docToRemove = docs[index];
      if (docToRemove.isExisting && docToRemove.id) {
        setRemovedDocIds((prev) => [...prev, docToRemove.id]);
      }
      return docs.filter((_, i) => i !== index);
    });
    
  };

  // useEffect(() => {
  //   if (onFormDataChange) {
  //     onFormDataChange(formData);
  //   }
  // }, [formData, onFormDataChange]);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    // console.log("Form submission triggered");
    // Check if any update is needed
    const hasChangedFields = Object.entries(formData).some(
      ([key, value]) => originalData && value !== originalData[key]
    );

    const hasNewDocuments = documents.some(doc => doc.file);
    const hasRemovedDocuments = removedDocIds.length > 0;
    const hasInboundImages = inboundImages.some(img => img.file);
    const hasEmptyImages = emptyImages.some(img => img.file);

    if (
      !hasChangedFields &&
      !hasNewDocuments &&
      !hasRemovedDocuments &&
      !hasInboundImages &&
      !hasEmptyImages
    ) {
      alert("No update found");
      return;
    }

    const payload = new FormData();

    const safeAppend = (key, value) => {
      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        value !== "null"
      ) {
        payload.append(key, value);
      }
    };
    // ✅ Basic fields
    
    safeAppend("container_no", formData.container_no || null);
    safeAppend("in_bound", formData.in_bound || null);
    safeAppend("empty_date", formData.empty_date || null);
    safeAppend("out_bound", formData.out_bound || null);
    safeAppend("unloaded_at_port", formData.unloaded_at_port || null);
    safeAppend("note", formData.note || null);
    safeAppend("tax", formData.tax || null);
    safeAppend("PONo", formData.PONo || null);
    safeAppend("status", formData.status || null);
    safeAppend("type", formData.type || null);
    safeAppend("emptied_at", formData.emptied_at || null);
    // console.log(formData.inBound, "ljh")
    // ✅ Bill of Lading
    safeAppend("bill_of_landing.BillOfLanding", formData.BillOfLanding || null);
    safeAppend("bill_of_landing.Vessel", formData.vessal || null);
    safeAppend("bill_of_landing.Provider", formData.provider || null);
    safeAppend("bill_of_landing.Consignee", formData.consignee || null);
    safeAppend("bill_of_landing.Supplier", formData.supplier || null);
    safeAppend("bill_of_landing.Doc", formData.shippingType || null);
    safeAppend("bill_of_landing.ArrivalDate", formData.arrival_on_port || null);

    formData.material?.forEach(mat => {
      payload.append("materials", mat)
    })
    // ✅ New Documents
    documents.forEach(doc => {
      if (doc.file) {
        payload.append("new_docs", doc.file); // File
      }
    });
    // console.log(inboundImages)

    // ✅ Inbound Images
    inboundImages.forEach(img => {
      if (img.file) {
        payload.append("inbound_images", img.file);
      }
    });

    // ✅ Empty Images
    emptyImages.forEach(img => {
      if (img.file) {
        payload.append("empty_images", img.file);
      }
    });

    // ✅ Removed Document IDs
    removedDocIds.forEach(id => {
      payload.append("remove_doc_ids", id);
    });
    
    // for (const [key, value] of payload.entries()) {
    //   console.log("Value", `${key}: ${value}`);
    // }

    // console.log(payload)
    // console.log("Val",payload)
    // console.log(mode)
    // const submissionData = {
    //   container_no: payload.get('container_no'),
    //   type: payload.get('type'),
    //   status: payload.get('status'),
    //   // Include all other fields...
    //   material: payload.getAll('material'),
    //   inboundImages: inboundImages.filter(img => img.file),
    //   emptyImages: emptyImages.filter(img => img.file),
    //   documents: documents.filter(doc => doc.file)
    // };
      // for (var pair of payload.entries()) {
      //     console.log(pair[0]+ ', ' + pair[1]); 
      // }
    onSubmitSuccess(payload)

  };
  
  // const handleSubmit = async (e) => {
  //   e.preventDefault();
    
  //   // Prepare form data without submitting
  //   const formData = new FormData(e.target);
  //   const formJson = Object.fromEntries(formData.entries());
    
  //   // Clean and transform data as needed
  //   const cleanedData = {
  //     ...formJson,
  //     material: formData.getAll('material'), // For multi-select
  //     // Add other transformations
  //   };

  //   // Return data to parent component
  //   if (onSubmitSuccess) {
  //     onSubmitSuccess(cleanedData);
  //   }
  // };

  const fields = [
    // { label: "Bill Of Landing", name: "BillOfLanding", type: "text", permission: "BL", options: [] },
    { label: "Container No", name: "container_no", type: "text", permission: "ContainerNo" },
    { label: "Type", name: "type", type: "addSelect", options: type, permission: "ContainerType", api: "setContainerType", refreshVal:"type"},
    // { label: "Arrival Date", name: "arrival_on_port", type: "datetime-local", permission: "ArrivalDate" },
    { label: "PO No", name: "PONo", type: "text", permission: "PoNo" },

    // { label: "Supplier", name: "supplier", type: "addSelect", options: suppliers, permission: "Supplier", refreshVal: "suppliers", api: "setSupplier"},
    // { label: "Consignee", name: "consignee", type: "addSelect", options: consignees, permission: "Consignee", api:"setConsignee", refreshVal:"consignees"},
    // { label: "Shipping Type", name: "shippingType", type: "addSelect", options: shipping, permission: "Shipping", api:"setShippingDocument", refreshVal:"shipping" },
    // { label: "Vessal", name: "vessal", type: "addSelect", permission: "Vessal", options: vesselList, api:"setVessal", refreshVal:"vessal" },
    // { label: "Tax", name: "tax", type: "checkbox", permission: "Tax" },
    { label: "Material", name: "material", type: "tagselect", permission: "Material", options: materialOptions},

    { label: "Status", name: "status", type: "select", options: statusOptions, permission: "Status", api: "", refreshVal:"" },
    { label: "In Bound", name: "in_bound", type: "datetime-local", permission: "InBound" },
    { label: "Empty Date", name: "empty_date", type: "date", permission: "EmptyDate" },
    { label: "Out Bound", name: "out_bound", type: "datetime-local", permission: "OutBound" },
    { label: "Unloaded at Port", name: "unloaded_at_port", type: "date", permission: "UnloadedAtDock" },
    { label: "Empty At", name: "emptied_at", type: "addSelect", options: emptyLocations, permission: "EmptyAt", api:"setUnloadVenue", refreshVal:"emptyLocations" },
    
  ];
  
  return (
    <form onSubmit={handleSubmit} className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 ${theme.background}`}>
        {fields
          .filter(({ permission }) => hasViewPermission(permission))
          .map(({ label, name, type, options, permission, api, refreshVal }) => (
            <div key={name} className={name === "material" ? "col-span-full md:col-span-3" : ""}>
              <label htmlFor={name} className={`block mb-1 font-medium ${theme.text}`}>{label}</label>
              {type === "select" ? (
                <TypableSelect
                  options={options}
                  value={formData[name]}
                  onChange={(val) => {
                    if (hasEditPermission(permission)) {
                      setFormData(prev => ({ ...prev, [name]: val }));
                    }
                  }}
                  placeholder={`Select ${label}`}
                  disabled={!hasEditPermission(permission) || options.length === 0}
                />
              ) : type === "textarea" ? (
                <textarea
                  id={name}
                  name={name}
                  value={formData[name] || ''}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full border rounded px-3 py-1.5 resize-none text-base ${theme.border} ${theme.background} ${theme.text} placeholder-gray-400 dark:placeholder-gray-500`}
                  disabled={!hasEditPermission(permission)}
                />
              ) : type === "checkbox" ? (
                <input
                  id={name}
                  type="checkbox"
                  name={name}
                  checked={!!formData[name]}
                  onChange={(e) => {
                    if (hasEditPermission(permission)) {
                      setFormData(prev => ({
                        ...prev,
                        [name]: e.target.checked ? 1 : 0
                      }));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={!hasEditPermission(permission)}
                />
              ) : type === "addSelect" ? ( 
                            <GenericSelector
                            value={formData[name] || null}
                            onChange={(val) =>
                                setFormData((prev) => ({
                                ...prev,
                                [name]: val,
                                }))
                            }
                            placeholder={label || ""}
                            options={options}
                            labelKey="name"
                            valueKey="id"
                            onAddNew={() => refresh(refreshVal)}
                            addApi={api}
                            />

              ) : type === "tagselect" ? (
                  <>
                                    <MaterialTagSelector
                    value={formData[name] || []}
                    onChange={(val) => {
                      if (hasEditPermission(permission)) {
                        setFormData((prev) => ({ ...prev, [name]: val }));
                      }
                    }}
                    options={options?.map((opt) => opt)} // assuming you store materials in `type` or similar
                    disabled={!hasEditPermission(permission)}
                    onNewMaterialCreated = {() => refresh("material")}
                  />
                  </>

              ):
              (
                <input
                  id={name}
                  type={type}
                  name={name}
                  value={formData[name] || ''}
                  onChange={handleChange}
                  onFocus={(e) => {
                    if (type === "date" && e.target.showPicker) e.target.showPicker();
                  }}
                  className={`w-full border rounded px-3 py-1.5 text-base ${theme.border} ${theme.background} ${theme.text} placeholder-gray-400 dark:placeholder-gray-500`}
                  disabled={!hasEditPermission(permission)}
                />
              )}
            </div>
          ))}

        {hasViewPermission("PersonalNote") && (
          <div className="col-span-full">
            <label htmlFor="note" className={`block mb-1 font-medium ${theme.text}`}>Personal Note</label>
            <textarea
              id="note"
              name="note"
              value={formData.note || ''}
              onChange={handleChange}
              className={`w-full border rounded px-2 py-1.5 ${theme.border} ${theme.background} ${theme.text} placeholder-gray-400 dark:placeholder-gray-500`}
              rows={2}
              disabled={!hasEditPermission("PersonalNote")}
            />
          </div>
        )}

      {/* Documents */}
      {hasViewPermission("Document") && (  <div className="col-span-full">
          <label className={`block mb-2 font-semibold ${theme.text}`}>Documents</label>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents
              
              ?.map((doc, idx) => (
                <div key={idx} className={`border rounded p-3 relative ${theme.mutedBg} ${theme.text} text-sm shadow-sm`}>
                  <div className="flex justify-between items-center mb-2">
                    <a
                      href={
                        doc.isExisting
                          ? `${process.env.REACT_APP_NETWORK}/getDocument/${doc.id}`
                          : URL.createObjectURL(doc.file)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate w-4/5 text-blue-600 hover:underline"
                      title="Click to view document"
                    >
                      {doc.isExisting
                        ? doc.file_path.split(/[\\/]/).pop()
                        : doc.file.name}
                    </a>

                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {doc.isExisting
                        ? doc.file_path?.split(".").pop()
                        : doc.file?.type?.split("/")[1] || "file"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeDocumentInput(idx)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-base"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>



          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf,image/*"
            onChange={handleAddNewFile}
            className="hidden"
          />
          {hasEditPermission("Document") && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={triggerFilePicker}
              className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-sm"
            >
              + Add Document
            </button>
          </div>
          )}
        </div>
      )}
      {/* Inbound Images */}

      {/* Inbound Images Upload */}
      {formData.in_bound && (
        <div className="col-span-full">
          <label className="block mb-1 font-medium">Inbound Images</label>
          <button
            type="button"
            onClick={() => inboundInputRef.current?.click()}
            className="mt-2 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
           >
            + Add Inbound Image
          </button>

          <input
            type="file"
            accept="image/*"
            onChange={handleInboundImageUpload} // or handleEmptyImageUpload
            className="hidden"
              capture="environment"
            ref={inboundInputRef} // or emptyInputRef
            />
            {inboundImages
              
              ?.map((doc, idx) => (
                <div key={idx} className={`border rounded p-3 relative ${theme.mutedBg} ${theme.text} text-sm shadow-sm`}>
                  <div className="flex justify-between items-center mb-2">
                    <a
                      href={
                        doc.isExisting
                          ? `${process.env.REACT_APP_NETWORK}/getDocument/${doc.id}`
                          : URL.createObjectURL(doc.file)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate w-4/5 text-blue-600 hover:underline"
                      title="Click to view document"
                    >
                      {doc.isExisting
                        ? doc.file_path.split(/[\\/]/).pop()
                        : doc.file.name}
                    </a>

                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {doc.isExisting
                        ? doc.file_path?.split(".").pop()
                        : doc.file?.type?.split("/")[1] || "file"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeInboundImageInput(idx)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-base"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}

        </div>
       )}

      {/* Empty Date Images Upload */}
      {formData.empty_date && (
        <div className="col-span-full">
          <label className="block mb-1 font-medium">Empty Date Images</label>
          <button
            type="button"
            onClick={() => emptyInputRef.current?.click()}
            className="mt-2 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
           >
            + Add Empty Image
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={handleEmptyImageUpload} // or handleEmptyImageUpload
            className="hidden"
              capture="environment"
            ref={emptyInputRef} // or emptyInputRef
          />
            {(emptyImages.length > 0) && (
              <div className="space-y-1">
                {emptyImages?.map((img, idx) => {
                  const fileName = img.isExisting
                    ? img.file_path.split(/[\\/]/).pop()
                    : img.file?.name;

                  const fileUrl = img.isExisting
                    ? `${process.env.REACT_APP_NETWORK}/getEmptyImage/${img.id}`
                    : URL.createObjectURL(img.file);

                  return (
                    <div key={idx} className="flex items-center justify-between text-sm bg-gray-100 px-3 py-1.5 rounded shadow">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate max-w-[85%]"
                      >
                        {fileName}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeEmptyImageInput(idx)}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}


        </div>
      )}


      {/* Submit */}
      <div className="col-span-full flex justify-end space-x-2">


        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {mode === "add" ? "Add to List" : "Update"}
        </button>
        { mode === "edit" &&(

                    <button
              type="button"
              onClick={() => handleDeleteFunction(editData.Container_ID)}
              className="px-4 bg-red-600 "
            >
              Delete
            </button>
        )
        }
      </div>
    </form>
  // </div>  
  );
}

export default ContainerEntryForm;
