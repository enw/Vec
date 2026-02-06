import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface InputPromptProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export const InputPrompt: React.FC<InputPromptProps> = ({ onSubmit, disabled }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (submittedValue: string) => {
    const trimmed = submittedValue.trim();
    if (trimmed.length > 0) {
      onSubmit(trimmed);
      setValue('');
    }
  };

  if (disabled) {
    return (
      <Box>
        <Text dimColor>{'> '}</Text>
        <Text dimColor>(streaming...)</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text>{'> '}</Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};
