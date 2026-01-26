import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import HomePage from "./HomePage";

describe("HomePage", () => {
  it("renders hero card text", () => {
    render(<HomePage />);
    expect(screen.getByText(/casino online/i)).toBeInTheDocument();
  });
});
