
import React, { useRef } from 'react';
import Icon from './Icon';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  label: string;
  id: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, label, id }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div>
      <input
        type="file"
        id={id}
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
      <button
        onClick={handleClick}
        className="w-full bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-700 hover:border-gray-500 transition-colors"
      >
        <div className="flex flex-col items-center justify-center">
            <Icon type="upload" className="w-8 h-8 mb-2 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">{label}</span>
            <span className="text-xs text-gray-500">PNG, JPG, WEBP</span>
        </div>
      </button>
    </div>
  );
};

export default FileUpload;
