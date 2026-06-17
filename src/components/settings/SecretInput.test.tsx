import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SecretInput } from "./SecretInput";

describe("SecretInput Component", () => {
  it("renders with custom placeholder when not configured", () => {
    render(
      <SecretInput
        value={{ configured: false, maskedValue: null }}
        onChange={vi.fn()}
        placeholder="Custom Placeholder"
      />
    );
    expect(screen.getByPlaceholderText("Custom Placeholder")).toBeInTheDocument();
  });

  it("renders with configured status and masked value in placeholder", () => {
    render(
      <SecretInput
        value={{ configured: true, maskedValue: "abcd****wxyz" }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText("설정됨: abcd****wxyz")).toBeInTheDocument();
  });

  it("triggers onChange when user types a new value", () => {
    const handleChange = vi.fn();
    render(
      <SecretInput
        value={{ configured: true, maskedValue: "abcd****wxyz" }}
        onChange={handleChange}
      />
    );

    const input = screen.getByPlaceholderText("설정됨: abcd****wxyz");
    fireEvent.change(input, { target: { value: "new_secret_key" } });
    
    expect(handleChange).toHaveBeenCalledWith("new_secret_key");
  });
});
