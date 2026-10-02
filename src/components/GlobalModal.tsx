import React from 'react';

export interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
}

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
}

interface GlobalModalProps {
  alertState: AlertState;
  onCloseAlert: () => void;
  confirmState: ConfirmState;
  onCloseConfirm: () => void;
  onConfirmAction: () => void;
}

export const GlobalModal: React.FC<GlobalModalProps> = ({
  alertState,
  onCloseAlert,
  confirmState,
  onCloseConfirm,
  onConfirmAction,
}) => {
  return (
    <>
      {/* Alert Modal */}
      {alertState.isOpen && (
        <div
          id="globalAlertModal"
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog-custom">
            <div className="modal-header-custom">
              <h4 className="modal-title-custom" id="globalAlertModalLabel">
                {alertState.title || 'Notification'}
              </h4>
              <button
                id="alertModalCloseBtn"
                type="button"
                className="modal-close-btn"
                onClick={onCloseAlert}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div
              className="modal-body-custom"
              id="globalAlertModalBody"
            >
              {alertState.message}
            </div>
            <div className="modal-footer-custom">
              <button
                id="globalAlertOkBtn"
                type="button"
                className="btn btn-spa-primary"
                onClick={onCloseAlert}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState.isOpen && (
        <div
          id="globalConfirmModal"
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog-custom">
            <div className="modal-header-custom">
              <h4 className="modal-title-custom" id="globalConfirmModalLabel">
                {confirmState.title || 'Confirm'}
              </h4>
              <button
                id="confirmModalCloseBtn"
                type="button"
                className="modal-close-btn"
                onClick={onCloseConfirm}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div
              className="modal-body-custom"
              id="globalConfirmModalBody"
            >
              {confirmState.message}
            </div>
            <div className="modal-footer-custom">
              <button
                id="globalConfirmNoBtn"
                type="button"
                className="btn btn-spa-cancel"
                onClick={onCloseConfirm}
              >
                Cancel
              </button>
              <button
                id="globalConfirmYesBtn"
                type="button"
                className="btn btn-spa-primary"
                onClick={() => {
                  onConfirmAction();
                  onCloseConfirm();
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
