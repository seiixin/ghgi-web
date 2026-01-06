import React from "react";
import SubmissionWizardBase from "./SubmissionWizardBase";

export default function NewSubmissionWizard({ onCreatedOrSubmitted }) {
  return (
    <SubmissionWizardBase
      mode="create"
      onCreatedOrSubmitted={onCreatedOrSubmitted}
    />
  );
}
