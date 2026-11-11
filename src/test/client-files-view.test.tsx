import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientFilesView } from "@/mansa/components/dashboard/ClientFilesView";

const file = {
  id: "file-storage-only",
  name: "IMG_3706.png",
  title: "IMG_3706.png",
  description: "Image privée",
  mime_type: "image/png",
  file_size: 2048,
  storageKey: "creator-1/prod-1794225451216/file-IMG_3706.png",
};

describe("ClientFilesView", () => {
  it("affiche un fichier avec storageKey sans downloadUrl et déclenche son téléchargement", () => {
    const onDownload = vi.fn();
    render(
      <ClientFilesView
        companyName="Gold"
        files={[file]}
        lockedFiles={[]}
        onBack={vi.fn()}
        onDownload={onDownload}
        onUnlockFile={vi.fn()}
      />,
    );

    expect(screen.getByText("IMG_3706.png")).toBeInTheDocument();
    expect(screen.getByText("1 fichier")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Télécharger/ }));
    expect(onDownload).toHaveBeenCalledWith(file);
  });
});
