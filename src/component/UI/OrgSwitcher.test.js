import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import OrgSwitcher from "./OrgSwitcher";
import { useAuth } from "../../context/AuthContext";
jest.mock("axios", () => ({ get: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext", () => ({ useTheme: () => ({ isDark: false, theme: {} }) }));

test("company selector exposes only assigned companies and pins explicit selection", async () => {
  localStorage.setItem("token", "test-only");
  const select = jest.fn();
  useAuth.mockReturnValue({ isRoot: true, orgName: "Main", selectedOrgId: null, setSelectedOrgId: select });
  axios.get.mockResolvedValue({ data: [{ id: 7, name: "Main", modules: ["INVENTORY"] },
    { id: 8, name: "DEMO ONLY - FreightLens T05", modules: ["INVENTORY"] }] });
  render(<OrgSwitcher />);
  fireEvent.click(screen.getByRole("button", { name: "All Companies (Sahaj Group)" }));
  fireEvent.click(await screen.findByRole("button", { name: "DEMO ONLY - FreightLens T05" }));
  expect(select).toHaveBeenLastCalledWith(8, ["INVENTORY"]);
  expect(screen.queryByRole("button", { name: "DEMO ONLY - FreightLens T05" })).not.toBeInTheDocument();
  localStorage.removeItem("token");
});
