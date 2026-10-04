import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import NotificationsButton from "./NotificationsButton";

jest.mock("axios", () => ({ get: jest.fn(), patch: jest.fn(), post: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ token: "test-token", selectedOrgId: 1 }),
}));
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }), { virtual: true });

beforeEach(() => {
  jest.clearAllMocks();
  axios.get.mockResolvedValue({ data: {
    notifications: [{ id: 9, title: "Policy review requested",
      message: "A case awaits review", is_read: false,
      link_entity_type: "MANAGER_CASE" }],
    unread_count: 1, page: 1, pages: 1,
  } });
  axios.patch.mockResolvedValue({ data: { success: true } });
});

test("profile notifications open the recipient inbox and case queue", async () => {
  render(<NotificationsButton isDark={false} canOpenCases />);
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  expect(await screen.findByText("Policy review requested")).toBeInTheDocument();
  expect(screen.getByText("1 unread")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Policy review requested/ }));
  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith(
    `${process.env.REACT_APP_NETWORK}/notifications/9/read`
  ));
  expect(mockNavigate).toHaveBeenCalledWith("/inventory/approvals");
});
