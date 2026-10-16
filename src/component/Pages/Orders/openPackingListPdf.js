import axios from "axios";
import { toast } from "react-toastify";

/**
 * Open a packing list PDF in a new tab.
 *
 * Not window.open on the API URL: that is a plain browser navigation carrying
 * no Authorization header, and the token lives in localStorage rather than a
 * cookie, so the server answers "Not authenticated". The bytes have to be
 * fetched with the header and handed to the tab as a blob.
 *
 * The tab is opened first, before the await, because a window.open that comes
 * after one is no longer tied to the click and popup blockers stop it.
 */
export default async function openPackingListPdf(id, number) {
  const tab = window.open("", "_blank", "noopener");
  if (tab) {
    tab.document.write(
      "<title>Preparing…</title><p style='font:14px system-ui;padding:24px'>Preparing the packing list…</p>"
    );
  }

  try {
    const res = await axios.get(
      `${process.env.REACT_APP_NETWORK}/packing-lists/${id}/pdf`,
      {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          skip_zrok_interstitial: "true",
        },
      }
    );

    const url = window.URL.createObjectURL(
      new Blob([res.data], { type: "application/pdf" })
    );

    if (tab) {
      tab.location.href = url;
    } else {
      // Popup blocked: fall back to a download, which never is.
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${number || `packing-list-${id}`}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    // Long enough for the tab to have loaded it; the blob dies with the page.
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  } catch (err) {
    if (tab) tab.close();
    let detail = err.response?.data?.detail;
    // An error body on a blob request arrives as a Blob, not as json.
    if (err.response?.data instanceof Blob) {
      try {
        detail = JSON.parse(await err.response.data.text()).detail;
      } catch {
        detail = null;
      }
    }
    toast.error(detail || "Could not generate the packing list PDF");
  }
}
