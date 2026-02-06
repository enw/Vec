/**
 * Input classification system with branded types
 * Classifies inputs by source and tracks trust status
 */

import { TrustedInput, UntrustedInput, InputSource } from '../types.js';
import { validationLogger } from '../audit/logger.js';

/**
 * Classified input with runtime metadata
 */
export interface ClassifiedInput {
  value: string;
  source: InputSource;
  trusted: boolean;
}

/**
 * Trust map: defines which input sources are trusted by default
 * USER_COMMAND: true - direct CLI input from user
 * All others: false - may contain injected/malicious content
 */
const trustMap: Record<InputSource, boolean> = {
  [InputSource.USER_COMMAND]: true,
  [InputSource.FILE_CONTENT]: false,
  [InputSource.NETWORK]: false,
  [InputSource.ENVIRONMENT]: false,
};

/**
 * Classify input by source, return with trust metadata
 */
export function classifyInput(
  input: string,
  source: InputSource
): ClassifiedInput {
  const trusted = trustMap[source];

  validationLogger.debug(
    {
      source,
      trusted,
      length: input.length,
    },
    `Classified input as ${trusted ? 'trusted' : 'untrusted'}`
  );

  return {
    value: input,
    source,
    trusted,
  };
}

/**
 * Type guard to check if input is trusted
 */
export function isTrusted(
  classified: ClassifiedInput
): classified is ClassifiedInput & { trusted: true } {
  return classified.trusted === true;
}

/**
 * Promote classified input to TrustedInput branded type
 * Throws if input is not trusted
 */
export function asTrusted(classified: ClassifiedInput): TrustedInput {
  if (!classified.trusted) {
    validationLogger.error(
      { source: classified.source },
      'Attempted to use untrusted input as trusted'
    );
    throw new Error(
      `Cannot use ${classified.source} input as trusted without validation`
    );
  }

  return classified.value as TrustedInput;
}

/**
 * Wrap classified input as UntrustedInput branded type
 */
export function asUntrusted(classified: ClassifiedInput): UntrustedInput {
  return classified.value as UntrustedInput;
}
